import { createError } from 'h3'

type FlatMenuNode = {
  id: string
  parentId: string | null
  sortOrder: number
}

export type MenuTreeNode<T extends FlatMenuNode> = T & {
  children: Array<MenuTreeNode<T>>
}

export const MAX_MENU_DEPTH = 3

export function buildMenuTree<T extends FlatMenuNode>(rows: T[]): Array<MenuTreeNode<T>> {
  const map = new Map<string, MenuTreeNode<T>>()
  const roots: Array<MenuTreeNode<T>> = []

  for (const row of rows) {
    map.set(row.id, { ...row, children: [] })
  }

  for (const row of rows) {
    const node = map.get(row.id)
    if (!node) continue
    if (row.parentId && map.has(row.parentId)) {
      map.get(row.parentId)!.children.push(node)
      continue
    }
    roots.push(node)
  }

  const sortNodes = (nodes: Array<MenuTreeNode<T>>) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)

  return roots
}

export function validateMenuReorderGraph(
  items: Array<{ id: string; parentId: string | null; depth: number }>,
  maxDepth = MAX_MENU_DEPTH,
) {
  const idSet = new Set(items.map((item) => item.id))
  const parentById = new Map(items.map((item) => [item.id, item.parentId]))
  const depthById = new Map(items.map((item) => [item.id, item.depth]))

  for (const item of items) {
    if (item.depth >= maxDepth) {
      throw createError({
        statusCode: 400,
        message: `菜單最多只支援 ${maxDepth} 層`,
      })
    }
    if (item.parentId && !idSet.has(item.parentId)) {
      throw createError({ statusCode: 400, message: '排序資料包含不存在的父節點' })
    }
    if (item.parentId === item.id) {
      throw createError({ statusCode: 400, message: '菜單節點不能成為自己的父節點' })
    }
  }

  for (const { id } of items) {
    const visiting = new Set<string>()
    let current: string | null = id
    while (current) {
      if (visiting.has(current)) {
        throw createError({ statusCode: 400, message: '偵測到循環層級，請重新排序' })
      }
      visiting.add(current)
      current = parentById.get(current) ?? null
    }
  }

  for (const { id, parentId } of items) {
    if (!parentId) continue
    const depth = depthById.get(id)
    const parentDepth = depthById.get(parentId)
    if (depth === undefined || parentDepth === undefined) continue
    if (depth !== parentDepth + 1) {
      throw createError({
        statusCode: 400,
        message: '排序層級資料不正確，子節點 depth 必須等於父節點 depth + 1',
      })
    }
  }
}

