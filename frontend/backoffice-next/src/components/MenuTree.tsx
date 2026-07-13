import { useState } from "react";

import { ChevronRight } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MenuTreeNode } from "@/views/permission-admin/permissionAdminUtils";

interface MenuTreeProps {
  nodes: MenuTreeNode[];
  defaultExpanded?: boolean;
  checkable?: boolean;
  checkedKeys?: string[];
  onCheckedChange?: (keys: string[]) => void;
  isCheckboxDisabled?: (key: string) => boolean;
  getCheckboxTooltip?: (key: string) => string | undefined;
  renderActions?: (node: MenuTreeNode) => React.ReactNode;
}

export type MenuTreeRowProps = {
  node: MenuTreeNode;
  depth: number;
  defaultExpanded?: boolean;
  checkable?: boolean;
  checkedKeys?: string[];
  onCheckedChange?: (keys: string[]) => void;
  isCheckboxDisabled?: (key: string) => boolean;
  getCheckboxTooltip?: (key: string) => string | undefined;
  renderActions?: (node: MenuTreeNode) => React.ReactNode;
};

function collectDescendantKeys(node: MenuTreeNode): string[] {
  const keys = [node.key];
  node.children?.forEach((child) => {
    keys.push(...collectDescendantKeys(child));
  });
  return keys;
}

/** Leaf keys under a node — parent check/indeterminate state is derived from these. */
function collectLeafKeys(node: MenuTreeNode): string[] {
  if (!node.children?.length) return [node.key];
  return node.children.flatMap(collectLeafKeys);
}

function getNodeCheckState(
  node: MenuTreeNode,
  checkedKeys: string[] | undefined,
): { checked: boolean; indeterminate: boolean } {
  if (!node.children?.length) {
    return { checked: checkedKeys?.includes(node.key) ?? false, indeterminate: false };
  }

  const leafKeys = collectLeafKeys(node);
  if (leafKeys.length === 0) {
    return { checked: false, indeterminate: false };
  }

  const checkedCount = leafKeys.filter((key) => checkedKeys?.includes(key)).length;
  if (checkedCount === 0) return { checked: false, indeterminate: false };
  if (checkedCount === leafKeys.length) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
}

function applyCascadeToggle(
  node: MenuTreeNode,
  checked: boolean,
  checkedKeys: string[],
  isCheckboxDisabled?: (key: string) => boolean,
): string[] {
  const affected = collectDescendantKeys(node).filter((key) => !isCheckboxDisabled?.(key));
  const set = new Set(checkedKeys);
  affected.forEach((key) => {
    if (checked) set.add(key);
    else set.delete(key);
  });
  return [...set];
}

function MenuTreeRowShell({
  depth,
  label,
  actions,
  collapsibleTrigger,
}: {
  depth: number;
  label: React.ReactNode;
  actions?: React.ReactNode;
  collapsibleTrigger?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/50"
      style={{ paddingLeft: depth * 16 + 8 }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {collapsibleTrigger}
        {label}
      </div>
      {actions}
    </div>
  );
}

function MenuTreeNodeRow({
  node,
  depth,
  defaultExpanded,
  checkable,
  checkedKeys,
  onCheckedChange,
  isCheckboxDisabled,
  getCheckboxTooltip,
  renderActions,
}: MenuTreeRowProps) {
  const hasChildren = Boolean(node.children?.length);
  const [open, setOpen] = useState(defaultExpanded ?? true);
  const { checked, indeterminate } = getNodeCheckState(node, checkedKeys);
  const disabled = isCheckboxDisabled?.(node.key) ?? false;
  const tooltip = getCheckboxTooltip?.(node.key);

  const toggleChecked = (next: boolean) => {
    if (!onCheckedChange || !checkedKeys) return;
    // Indeterminate → check all (standard tree UX); otherwise honor the checkbox value.
    const shouldCheck = indeterminate ? true : next;
    onCheckedChange(applyCascadeToggle(node, shouldCheck, checkedKeys, isCheckboxDisabled));
  };

  const label = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {checkable ? (
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          onCheckedChange={(value) => toggleChecked(value === true)}
          aria-label={node.label}
          title={tooltip}
        />
      ) : null}
      <span className="truncate font-medium">{node.label}</span>
      <span className="truncate text-muted-foreground">({node.key})</span>
    </div>
  );

  const actions = renderActions?.(node);

  if (!hasChildren) {
    return <MenuTreeRowShell depth={depth} label={label} actions={actions} />;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <MenuTreeRowShell
        depth={depth}
        label={label}
        actions={actions}
        collapsibleTrigger={
          <CollapsibleTrigger
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted",
            )}
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
          </CollapsibleTrigger>
        }
      />
      <CollapsibleContent>
        <MenuTree
          nodes={node.children ?? []}
          depth={depth + 1}
          defaultExpanded={defaultExpanded}
          checkable={checkable}
          checkedKeys={checkedKeys}
          onCheckedChange={onCheckedChange}
          isCheckboxDisabled={isCheckboxDisabled}
          getCheckboxTooltip={getCheckboxTooltip}
          renderActions={renderActions}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function MenuTree({
  nodes,
  depth = 0,
  defaultExpanded,
  checkable,
  checkedKeys,
  onCheckedChange,
  isCheckboxDisabled,
  getCheckboxTooltip,
  renderActions,
}: MenuTreeProps & { depth?: number }) {
  return (
    <div role={depth === 0 ? "tree" : undefined} className={depth === 0 ? "flex flex-col gap-0.5" : undefined}>
      {nodes.map((node) => (
        <div key={node.key} role="treeitem" tabIndex={-1} aria-expanded={node.children?.length ? true : undefined}>
          <MenuTreeNodeRow
            node={node}
            depth={depth}
            defaultExpanded={defaultExpanded}
            checkable={checkable}
            checkedKeys={checkedKeys}
            onCheckedChange={onCheckedChange}
            isCheckboxDisabled={isCheckboxDisabled}
            getCheckboxTooltip={getCheckboxTooltip}
            renderActions={renderActions}
          />
        </div>
      ))}
    </div>
  );
}

export { MenuTree, MenuTreeRowShell };
