import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit2,
  Eye,
  EyeOff,
  FolderOpen,
  Package2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react-native";
import {
  Category,
  CategoryNode,
  batchUpdateOrder,
  buildTree,
  createCategory,
  deleteCategoriesByIds,
  fetchAllCategories,
  flattenTree,
  generateSlug,
  getDescendantIds,
  reparentChildren,
  updateCategory,
} from "@/src/utils/categoryTree";
import CategoryImageUpload from "@/src/components/admin/CategoryImageUpload";
import CategoryProductsModal from "@/src/components/admin/CategoryProductsModal";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  name_vi: string;
  slug: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  image_url: string;
  group: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  name_vi: "",
  slug: "",
  parent_id: null,
  display_order: 1,
  is_active: true,
  image_url: "",
  group: "",
};

// ─── Confirm dialog helper (web + mobile) ────────────────────────────────────

const confirmAsync = (message: string): Promise<boolean> => {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) =>
    Alert.alert("Xác nhận", message, [
      { text: "Huỷ", style: "cancel", onPress: () => resolve(false) },
      { text: "Đồng ý", style: "destructive", onPress: () => resolve(true) },
    ])
  );
};

// ─── Component: Một row trong cây ────────────────────────────────────────────

interface CategoryRowProps {
  node: CategoryNode;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
  onMoveUp: (cat: Category) => void;
  onMoveDown: (cat: Category) => void;
  onViewProducts: (cat: Category) => void;
  isFirst: boolean;
  isLast: boolean;
}

function CategoryRow({
  node,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onViewProducts,
  isFirst,
  isLast,
}: CategoryRowProps) {
  const hasChildren = node.children.length > 0;
  const indent = node.depth * 24;

  return (
    <AdminDataWrapper style={[styles.row, !node.is_active && styles.rowInactive]}>
      <View style={[styles.rowLeft, { paddingLeft: indent + 12 }]}>
        {/* Chevron mở/đóng */}
        <Pressable
          onPress={() => hasChildren && onToggle(node.id)}
          style={[styles.chevronBtn, !hasChildren && { opacity: 0 }]}
        >
          {isExpanded ? (
            <ChevronDown size={16} color="#6B7280" />
          ) : (
            <ChevronRight size={16} color="#6B7280" />
          )}
        </Pressable>

        {/* Thumbnail ảnh danh mục */}
        {node.image_url ? (
          <Image
            source={{ uri: node.image_url }}
            style={styles.rowThumbnail}
            resizeMode="cover"
          />
        ) : (
          <FolderOpen
            size={16}
            color={node.depth === 0 ? "#2563EB" : node.depth === 1 ? "#7C3AED" : "#10B981"}
          />
        )}

        {/* Tên danh mục */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.catName, !node.is_active && { color: "#9CA3AF" }]}
            numberOfLines={1}
          >
            {node.name_vi || node.name}
          </Text>
          <Text style={styles.catMeta}>
            {node.name} · #{node.display_order}
            {node.children.length > 0 ? ` · ${node.children.length} con` : ""}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.rowActions}>
        {/* Badge cấp độ */}
        <View style={[styles.depthBadge, { backgroundColor: node.depth === 0 ? "#DBEAFE" : node.depth === 1 ? "#EDE9FE" : "#D1FAE5" }]}>
          <Text style={[styles.depthBadgeText, { color: node.depth === 0 ? "#1D4ED8" : node.depth === 1 ? "#6D28D9" : "#065F46" }]}>
            {node.depth === 0 ? "Gốc" : node.depth === 1 ? "Cấp 2" : "Cấp 3"}
          </Text>
        </View>

        {/* Nút di chuyển */}
        <Pressable
          style={[styles.iconBtn, isFirst && styles.iconBtnDisabled]}
          onPress={() => !isFirst && onMoveUp(node)}
          disabled={isFirst}
        >
          <ChevronUp size={14} color={isFirst ? "#D1D5DB" : "#6B7280"} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, isLast && styles.iconBtnDisabled]}
          onPress={() => !isLast && onMoveDown(node)}
          disabled={isLast}
        >
          <ChevronDown size={14} color={isLast ? "#D1D5DB" : "#6B7280"} />
        </Pressable>

        {/* Ẩn/Hiện */}
        <Pressable style={styles.iconBtn} onPress={() => onToggleActive(node)}>
          {node.is_active ? (
            <Eye size={15} color="#2563EB" />
          ) : (
            <EyeOff size={15} color="#9CA3AF" />
          )}
        </Pressable>

        {/* Xem sản phẩm trong danh mục */}
        <Pressable
          style={[styles.iconBtn, styles.iconBtnProducts]}
          onPress={() => onViewProducts(node)}
        >
          <Package2 size={15} color="#059669" />
        </Pressable>

        {/* Sửa */}
        <Pressable style={styles.iconBtn} onPress={() => onEdit(node)}>
          <Edit2 size={15} color="#4B5563" />
        </Pressable>

        {/* Xóa */}
        <Pressable
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={() => onDelete(node)}
        >
          <Trash2 size={15} color="#EF4444" />
        </Pressable>
      </View>
    </AdminDataWrapper>
  );
}

// ─── Component: Render đệ quy cây ────────────────────────────────────────────

interface TreeViewProps {
  nodes: CategoryNode[];
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
  onMoveUp: (cat: Category) => void;
  onMoveDown: (cat: Category) => void;
  onViewProducts: (cat: Category) => void;
  siblings: CategoryNode[]; // Danh sách anh chị em cùng cấp
}

function TreeView({
  nodes,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onViewProducts,
  siblings,
}: TreeViewProps) {
  return (
    <>
      {nodes.map((node, index) => {
        const isExpanded = expandedIds.has(node.id);
        return (
          <View key={node.id}>
            <CategoryRow
              node={node}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onViewProducts={onViewProducts}
              isFirst={index === 0}
              isLast={index === siblings.length - 1}
            />
            {/* Render con đệ quy nếu đang mở */}
            {isExpanded && node.children.length > 0 && (
              <TreeView
                nodes={node.children}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onViewProducts={onViewProducts}
                siblings={node.children}
              />
            )}
          </View>
        );
      })}
    </>
  );
}

// ─── Component: Form ─────────────────────────────────────────────────────────

interface CategoryFormProps {
  form: FormState;
  onChange: (f: Partial<FormState>) => void;
  flatNodes: CategoryNode[]; // Dùng cho dropdown cha
  excludeId?: number; // Không cho chọn chính mình hoặc con của mình làm cha
  editingId?: number | null;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function CategoryForm({
  form,
  onChange,
  flatNodes,
  excludeId,
  editingId,
  onSave,
  onCancel,
  saving,
}: CategoryFormProps) {
  // Lấy IDs cần loại trừ (bản thân + con cháu)
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (excludeId != null) {
      // Loại bỏ các node là con/cháu của categoryCurr đang edit
      const subtree = flatNodes
        .filter((n) => {
          let curr: CategoryNode | undefined = n;
          while (curr) {
            if (curr.id === excludeId) return true;
            curr = flatNodes.find((x) => x.id === curr!.parent_id);
          }
          return false;
        })
        .map((n) => n.id);
      setExcludedIds(new Set(subtree));
    } else {
      setExcludedIds(new Set());
    }
  }, [excludeId, flatNodes]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {editingId ? "✏️ Sửa danh mục" : "➕ Thêm danh mục mới"}
      </Text>

      {/* Tên tiếng Anh */}
      <Text style={styles.label}>Tên (tiếng Anh) *</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => onChange({ name: v })}
        placeholder="VD: Men Tops"
        placeholderTextColor="#9CA3AF"
      />

      {/* Tên tiếng Việt */}
      <Text style={styles.label}>Tên tiếng Việt *</Text>
      <TextInput
        style={styles.input}
        value={form.name_vi}
        onChangeText={(v) => {
          onChange({ name_vi: v, slug: generateSlug(v) });
        }}
        placeholder="VD: Áo Nam"
        placeholderTextColor="#9CA3AF"
      />

      {/* Slug (auto-generated) */}
      <Text style={styles.label}>Slug</Text>
      <TextInput
        style={[styles.input, { color: "#6B7280" }]}
        value={form.slug}
        onChangeText={(v) => onChange({ slug: v })}
        placeholder="auto-generated"
        placeholderTextColor="#9CA3AF"
      />

      {/* Upload ảnh - Chỉ hiện khi đang chỉnh sửa danh mục cụ thể */}
      {editingId && (
        <CategoryImageUpload
          categoryId={editingId}
          currentImageUrl={form.image_url}
          categoryName={form.name_vi || form.name}
          onUpdated={(url) => onChange({ image_url: url || "" })}
        />
      )}

      {/* Danh mục cha */}
      <Text style={styles.label}>Danh mục cha</Text>
      <ScrollView style={styles.selectBox} nestedScrollEnabled={true}>
        <Pressable
          style={[
            styles.selectItem,
            form.parent_id === null && styles.selectItemActive,
          ]}
          onPress={() => onChange({ parent_id: null })}
        >
          <Text
            style={[
              styles.selectItemText,
              form.parent_id === null && styles.selectItemTextActive,
            ]}
          >
            🌐 Danh mục gốc (không có cha)
          </Text>
        </Pressable>
        {flatNodes
          .filter((n) => !excludedIds.has(n.id))
          .map((n) => (
            <Pressable
              key={n.id}
              style={[
                styles.selectItem,
                form.parent_id === n.id && styles.selectItemActive,
              ]}
              onPress={() => onChange({ parent_id: n.id })}
            >
              <Text
                style={[
                  styles.selectItemText,
                  form.parent_id === n.id && styles.selectItemTextActive,
                  { paddingLeft: n.depth * 16 },
                ]}
              >
                {"　".repeat(n.depth)}
                {n.depth > 0 ? "└ " : ""}
                {n.name_vi || n.name}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      {/* Thứ tự hiển thị */}
      <Text style={styles.label}>Thứ tự hiển thị</Text>
      <TextInput
        style={styles.input}
        value={String(form.display_order)}
        onChangeText={(v) => onChange({ display_order: parseInt(v) || 1 })}
        keyboardType="numeric"
        placeholder="1"
        placeholderTextColor="#9CA3AF"
      />

      {/* Group */}
      <Text style={styles.label}>Nhóm (group)</Text>
      <TextInput
        style={styles.input}
        value={form.group}
        onChangeText={(v) => onChange({ group: v })}
        placeholder="VD: men, women, common"
        placeholderTextColor="#9CA3AF"
      />

      {/* Trạng thái */}
      <Pressable
        style={styles.toggleRow}
        onPress={() => onChange({ is_active: !form.is_active })}
      >
        <View
          style={[
            styles.toggle,
            form.is_active ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.is_active && styles.toggleThumbOn,
            ]}
          />
        </View>
        <Text style={styles.toggleLabel}>
          {form.is_active ? "Đang hiển thị" : "Đang ẩn"}
        </Text>
      </Pressable>

      {/* Footer buttons */}
      <View style={styles.formFooter}>
        <Pressable style={styles.cancelFormBtn} onPress={onCancel}>
          <X size={16} color="#374151" />
          <Text style={styles.cancelFormBtnText}>Huỷ</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Save size={16} color="white" />
          )}
          <Text style={styles.saveBtnText}>Lưu</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminCategoriesScreen() {
  const [flatList, setFlatList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewProductCat, setViewProductCat] = useState<Category | null>(null);

  // Build tree từ flatList — memo để không tính lại khi không cần
  const tree = useMemo(() => buildTree(flatList), [flatList]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);

  // Fetch tất cả 1 lần
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllCategories();
      setFlatList(data);
      // Mặc định mở tất cả level 0 & 1
      const defaultExpanded = new Set(
        data.filter((c) => c.parent_id === null).map((c) => c.id)
      );
      setExpandedIds(defaultExpanded);
    } catch (err: any) {
      alert("Lỗi tải danh mục: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useSupabaseRealtime({
    table: "categories",
    onUpdate: loadCategories,
  });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedIds(new Set(flatList.map((c) => c.id)));
  const collapseAll = () => setExpandedIds(new Set());

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingId(null);
    // Mặc định cho danh mục gốc khi mới mở form thêm mới
    const rootSiblings = flatList.filter((c) => c.parent_id === null);
    const maxOrder = rootSiblings.length > 0 
      ? Math.max(...rootSiblings.map((c) => c.display_order)) 
      : 0;
    setForm({ ...EMPTY_FORM, display_order: maxOrder + 1 });
    setShowForm(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      name_vi: cat.name_vi || "",
      slug: cat.slug || "",
      parent_id: cat.parent_id,
      display_order: cat.display_order,
      is_active: cat.is_active,
      image_url: cat.image_url || "",
      group: cat.group || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Vui lòng nhập tên danh mục!");
    if (!form.name_vi.trim()) return alert("Vui lòng nhập tên tiếng Việt!");

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: form.name.trim(),
          name_vi: form.name_vi.trim(),
          slug: form.slug.trim() || generateSlug(form.name_vi),
          parent_id: form.parent_id,
          display_order: form.display_order,
          is_active: form.is_active,
          image_url: form.image_url || null,
          group: form.group || null,
        });
      } else {
        await createCategory({
          name: form.name.trim(),
          name_vi: form.name_vi.trim(),
          slug: form.slug.trim() || generateSlug(form.name_vi),
          parent_id: form.parent_id,
          display_order: form.display_order,
          is_active: form.is_active,
          image_url: form.image_url || undefined,
          group: form.group || undefined,
        });
      }
      setShowForm(false);
      await loadCategories();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle ẩn/hiện ─────────────────────────────────────────────────────────

  const handleToggleActive = async (cat: Category) => {
    const ok = await confirmAsync(
      cat.is_active
        ? `Ẩn danh mục "${cat.name_vi || cat.name}"?`
        : `Hiện danh mục "${cat.name_vi || cat.name}"?`
    );
    if (!ok) return;
    try {
      await updateCategory(cat.id, { is_active: !cat.is_active });
      setFlatList((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  // ── Xóa an toàn ────────────────────────────────────────────────────────────

  const handleDelete = async (cat: Category) => {
    const descendants = getDescendantIds(cat.id, flatList);

    if (descendants.length > 0) {
      const siblings = flatList
        .filter((c) => c.parent_id === cat.parent_id && c.id !== cat.id)
        .map((c) => `"${c.name_vi || c.name}"`)
        .join(", ");

      if (Platform.OS === "web") {
        const choice = window.confirm(
          `Danh mục "${cat.name_vi || cat.name}" có ${descendants.length} danh mục con.\n\n` +
            `• OK = Xóa TẤT CẢ danh mục con.\n` +
            `• Cancel = Chuyển danh mục con lên cấp cha (${cat.parent_id ? "danh mục cha" : "danh mục gốc"}).`
        );
        if (choice) {
          // Xóa tất cả
          await deleteCategoriesByIds([cat.id, ...descendants]);
        } else {
          // Reparent children lên cha của cat rồi xóa cat
          await reparentChildren(cat.id, cat.parent_id);
          await deleteCategoriesByIds([cat.id]);
        }
        await loadCategories();
      } else {
        Alert.alert(
          "Xóa danh mục có con",
          `Danh mục "${cat.name_vi || cat.name}" có ${descendants.length} danh mục con.`,
          [
            { text: "Huỷ", style: "cancel" },
            {
              text: "Xóa tất cả",
              style: "destructive",
              onPress: async () => {
                await deleteCategoriesByIds([cat.id, ...descendants]);
                await loadCategories();
              },
            },
            {
              text: "Chuyển con lên cấp cha",
              onPress: async () => {
                await reparentChildren(cat.id, cat.parent_id);
                await deleteCategoriesByIds([cat.id]);
                await loadCategories();
              },
            },
          ]
        );
      }
    } else {
      const ok = await confirmAsync(
        `Xóa danh mục "${cat.name_vi || cat.name}"?`
      );
      if (ok) {
        await deleteCategoriesByIds([cat.id]);
        await loadCategories();
      }
    }
  };

  // ── Di chuyển lên/xuống trong cùng cấp ────────────────────────────────────

  const handleMove = async (cat: Category, direction: "up" | "down") => {
    // Lấy danh sách anh/chị em cùng cấp, đã sắp xếp theo display_order
    const siblings = flatList
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.display_order - b.display_order);

    const idx = siblings.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const swapTarget = siblings[swapIdx];
    const updates = [
      { id: cat.id, display_order: swapTarget.display_order },
      { id: swapTarget.id, display_order: cat.display_order },
    ];

    try {
      await batchUpdateOrder(updates);
      // Cập nhật local state để tránh re-fetch
      setFlatList((prev) =>
        prev.map((c) => {
          const u = updates.find((u) => u.id === c.id);
          return u ? { ...c, display_order: u.display_order } : c;
        })
      );
    } catch (err: any) {
      alert("Lỗi khi di chuyển: " + err.message);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý Danh mục</Text>
          <Text style={styles.subtitle}>
            {flatList.length} danh mục · {tree.length} gốc
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleOpenCreate}>
          <Plus size={18} color="white" />
          <Text style={styles.addBtnText}>Thêm Danh mục</Text>
        </Pressable>
      </View>

      {/* TOOLBAR */}
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={expandAll}>
          <ChevronDown size={14} color="#374151" />
          <Text style={styles.toolBtnText}>Mở tất cả</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={collapseAll}>
          <ChevronRight size={14} color="#374151" />
          <Text style={styles.toolBtnText}>Thu tất cả</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={loadCategories}>
          <Text style={styles.toolBtnText}>🔄 Làm mới</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* FORM */}
        {showForm && (
          <CategoryForm
            form={form}
            onChange={(partial) => {
              setForm((prev) => {
                const nextForm = { ...prev, ...partial };
                // Khi thay đổi danh mục cha, tự động tính toán thứ tự hiển thị cuối cùng trong nhóm cha đó
                if ("parent_id" in partial) {
                  const siblings = flatList.filter(
                    (c) => c.parent_id === partial.parent_id
                  );
                  const maxOrder =
                    siblings.length > 0
                      ? Math.max(...siblings.map((c) => c.display_order))
                      : 0;
                  nextForm.display_order = maxOrder + 1;
                }
                return nextForm;
              });
            }}
            flatNodes={flatNodes}
            excludeId={editingId ?? undefined}
            editingId={editingId}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        )}

        {/* TREE VIEW */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 60 }}
          />
        ) : tree.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Chưa có danh mục nào. Hãy thêm mới!
            </Text>
          </View>
        ) : (
          <View style={styles.treeContainer}>
            <TreeView
              nodes={tree}
              expandedIds={expandedIds}
              onToggle={toggleExpand}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onMoveUp={(cat) => handleMove(cat, "up")}
              onMoveDown={(cat) => handleMove(cat, "down")}
              onViewProducts={(cat) => setViewProductCat(cat)}
              siblings={tree}
            />
          </View>
        )}
      </ScrollView>

      {/* MODAL QUẢN LÝ SẢN PHẨM */}
      {viewProductCat && (
        <CategoryProductsModal
          visible={!!viewProductCat}
          categoryId={viewProductCat.id}
          categoryName={viewProductCat.name_vi || viewProductCat.name}
          onClose={() => setViewProductCat(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  // Tree
  treeContainer: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    minHeight: 52,
  },
  rowInactive: {
    backgroundColor: "#F9FAFB",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  chevronBtn: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  rowThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  catName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  catMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  depthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginRight: 4,
  },
  depthBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  iconBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  iconBtnProducts: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  iconBtnDanger: {
    backgroundColor: "#FEF2F2",
  },

  // Empty State
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#9CA3AF",
    fontSize: 15,
  },

  // Form
  formCard: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    outlineStyle: "none",
  } as any,

  // Dropdown select box
  selectBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
    maxHeight: 250,
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectItemActive: {
    backgroundColor: "#EFF6FF",
  },
  selectItemText: {
    fontSize: 13,
    color: "#374151",
  },
  selectItemTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingVertical: 4,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: "#2563EB",
  },
  toggleOff: {
    backgroundColor: "#D1D5DB",
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  toggleLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },

  // Form footer
  formFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelFormBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelFormBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
});
