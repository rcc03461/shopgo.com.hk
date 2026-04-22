import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminPatchMenuBodySchema } from '../../../utils/menuSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('菜單 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const menuId = idParsed.data

  const parsed = adminPatchMenuBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }
  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: '沒有要更新的欄位' })
  }

  const db = getDb(event)
  try {
    const [existing] = await db
      .select({
        id: schema.shopMenus.id,
        parentId: schema.shopMenus.parentId,
        linkType: schema.shopMenus.linkType,
      })
      .from(schema.shopMenus)
      .where(
        and(eq(schema.shopMenus.id, menuId), eq(schema.shopMenus.tenantId, session.tenantId)),
      )
      .limit(1)
    if (!existing) {
      throw createError({ statusCode: 404, message: '找不到菜單' })
    }

    if (patch.parentId !== undefined) {
      if (patch.parentId === menuId) {
        throw createError({ statusCode: 400, message: '菜單不能移到自己底下' })
      }
      if (patch.parentId) {
        const [parent] = await db
          .select({ id: schema.shopMenus.id })
          .from(schema.shopMenus)
          .where(
            and(
              eq(schema.shopMenus.id, patch.parentId),
              eq(schema.shopMenus.tenantId, session.tenantId),
            ),
          )
          .limit(1)
        if (!parent) {
          throw createError({ statusCode: 400, message: '父層菜單不存在' })
        }
      }
    }

    const nextLinkType = patch.linkType ?? existing.linkType
    const nextPageId = patch.pageId !== undefined ? patch.pageId : undefined
    const nextCustomUrl = patch.customUrl !== undefined ? patch.customUrl : undefined

    if (nextLinkType === 'page' && nextPageId === null) {
      throw createError({ statusCode: 400, message: '頁面連結必須提供 pageId' })
    }
    if (nextLinkType === 'custom' && nextCustomUrl === null) {
      throw createError({ statusCode: 400, message: '自訂連結必須提供 customUrl' })
    }

    if (nextPageId) {
      const [page] = await db
        .select({ id: schema.pages.id })
        .from(schema.pages)
        .where(
          and(eq(schema.pages.id, nextPageId), eq(schema.pages.tenantId, session.tenantId)),
        )
        .limit(1)
      if (!page) {
        throw createError({ statusCode: 400, message: '指定頁面不存在' })
      }
    }

    const next: Partial<typeof schema.shopMenus.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (patch.title !== undefined) next.title = patch.title
    if (patch.parentId !== undefined) next.parentId = patch.parentId
    if (patch.sortOrder !== undefined) next.sortOrder = patch.sortOrder
    if (patch.isVisible !== undefined) next.isVisible = patch.isVisible
    if (patch.target !== undefined) next.target = patch.target
    if (patch.linkType !== undefined) next.linkType = patch.linkType
    if (patch.pageId !== undefined) next.pageId = patch.pageId
    if (patch.customUrl !== undefined) next.customUrl = patch.customUrl

    if (patch.linkType === 'page') {
      next.customUrl = null
    }
    if (patch.linkType === 'custom') {
      next.pageId = null
    }

    const [updated] = await db
      .update(schema.shopMenus)
      .set(next)
      .where(
        and(eq(schema.shopMenus.id, menuId), eq(schema.shopMenus.tenantId, session.tenantId)),
      )
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到菜單' })
    }
    return { item: updated }
  } catch (e: unknown) {
    if (isError(e)) throw e
    console.error('[admin/menus PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新菜單失敗' })
  }
})

