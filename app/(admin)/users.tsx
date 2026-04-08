import { listProfiles, updateUserRole } from "@/src/services/admin/profiles";
import { Mail, Search, Shield, User as UserIcon } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const ROLE_OPTIONS = [
  { value: "user", label: "Người dùng", color: "#6B7280" },
  { value: "staff", label: "Nhân viên", color: "#8B5CF6" },
  { value: "admin", label: "Quản trị viên", color: "#EF4444" },
];

export default function AdminUsersScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await listProfiles();
      setProfiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      fetchProfiles();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const filteredProfiles = profiles.filter((p) =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (Platform.OS !== "web") {
    return <View style={styles.p10}><Text>Vui lòng dùng trình duyệt Web.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý Người dùng</Text>
          <Text style={styles.subtitle}>
            Phân quyền hệ thống cho nhân viên và quản lý danh sách khách hàng.
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm theo tên hoặc email..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* TABLE */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.tableCard}>
          {/* HEADER ROW */}
          <View style={styles.tableHeader}>
            <Text style={StyleSheet.flatten([styles.columnUser, styles.headerText])}>Người dùng</Text>
            <Text style={StyleSheet.flatten([styles.columnEmail, styles.headerText])}>Email</Text>
            <Text style={StyleSheet.flatten([styles.columnRole, styles.headerText, styles.textCenter])}>Vai trò</Text>
            <Text style={StyleSheet.flatten([styles.columnJoin, styles.headerText, styles.textCenter])}>Ngày tham gia</Text>
            <Text style={StyleSheet.flatten([styles.columnActions, styles.headerText, styles.textRight])}>Thay đổi quyền</Text>
          </View>

          {/* BODY ROWS */}
          <View>
            {filteredProfiles.map((user) => (
              <View 
                key={user.id} 
                style={styles.row}
              >
                <View style={StyleSheet.flatten([styles.columnUser, styles.rowItem])}>
                  <View style={styles.avatar}>
                    <UserIcon size={20} color="#2563EB" />
                  </View>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.userName}>{user.full_name || "Chưa cập nhật"}</Text>
                    <Text style={styles.userId}>ID: {user.id.slice(0, 8)}...</Text>
                  </View>
                </View>

                <View style={StyleSheet.flatten([styles.columnEmail, styles.rowItem])}>
                   <Mail size={14} color="#9CA3AF" />
                   <Text style={styles.emailText} numberOfLines={1}>{user.email || "N/A"}</Text>
                </View>

                <View style={StyleSheet.flatten([styles.columnRole, styles.itemsCenter])}>
                  <View 
                    style={StyleSheet.flatten([
                      styles.roleBadge,
                      { backgroundColor: `${ROLE_OPTIONS.find(r => r.value === user.role)?.color}20` }
                    ])}
                  >
                    <Text 
                      style={StyleSheet.flatten([
                        styles.roleText,
                        { color: ROLE_OPTIONS.find(r => r.value === user.role)?.color }
                      ])}
                    >
                      {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                    </Text>
                  </View>
                </View>

                <View style={StyleSheet.flatten([styles.columnJoin, styles.itemsCenter])}>
                  <Text style={styles.dateText}>
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </Text>
                </View>

                <View style={StyleSheet.flatten([styles.columnActions, styles.actionsContainer])}>
                  {ROLE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleUpdateRole(user.id, opt.value)}
                      disabled={user.role === opt.value}
                      style={({ hovered }: any) => StyleSheet.flatten([
                        styles.roleButton,
                        user.role === opt.value ? styles.roleButtonActive : styles.roleButtonInactive,
                        hovered && user.role !== opt.value && styles.roleButtonHover
                      ])}
                    >
                      <Text style={StyleSheet.flatten([
                        styles.roleButtonText,
                        user.role === opt.value ? styles.roleButtonTextActive : styles.roleButtonTextInactive
                      ])}>
                        {opt.label.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 40 },
  p10: { padding: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "between" as any,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 48,
    width: 384,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  tableCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerText: {
    fontWeight: "700",
    color: "#4B5563",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  columnUser: { flex: 1.5 },
  columnEmail: { flex: 1.5 },
  columnRole: { flex: 1 },
  columnJoin: { flex: 1 },
  columnActions: { flex: 1.5 },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" },
  itemsCenter: { alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  userNameContainer: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  userId: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  emailText: {
    color: "#4B5563",
    marginLeft: 8,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    color: "#6B7280",
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleButtonInactive: {
    backgroundColor: "white",
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  roleButtonHover: {
    borderColor: "#2563EB",
  },
  roleButtonText: {
    fontSize: 10,
    fontWeight: "700",
  },
  roleButtonTextInactive: {
    color: "#374151",
  },
  roleButtonTextActive: {
    color: "#9CA3AF",
  }
});

