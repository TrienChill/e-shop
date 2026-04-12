import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

export interface ExcelRow {
  "ID sản phẩm": string;
  "Tên sản phẩm": string;
  "Mô tả ngắn": string;
  "Giá cơ bản": number;
  "Trạng thái": string;
  "ID SKU": string;
  "Mã SKU": string;
  "Màu sắc": string;
  "Kích thước": string;
  "Giá bán": number;
  "Số lượng tồn kho": number;
}

export const exportProductsToExcel = async () => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, name, price, short_description, is_active,
        product_variants ( id, sku, color, size, price, stock )
      `);

    if (error) throw error;

    const exportData: ExcelRow[] = [];

    products.forEach((product: any) => {
      const baseRow = {
        "ID sản phẩm": product.id,
        "Tên sản phẩm": product.name,
        "Mô tả ngắn": product.short_description || "",
        "Giá cơ bản": product.price || 0,
        "Trạng thái": product.is_active ? "Đang bán" : "Ngưng bán",
      };

      if (product.product_variants && product.product_variants.length > 0) {
        product.product_variants.forEach((variant: any) => {
          exportData.push({
            ...baseRow,
            "ID SKU": variant.id,
            "Mã SKU": variant.sku || "",
            "Màu sắc": variant.color || "",
            "Kích thước": variant.size || "",
            "Giá bán": variant.price || 0,
            "Số lượng tồn kho": variant.stock || 0,
          });
        });
      } else {
        exportData.push({
          ...baseRow,
          "ID SKU": "",
          "Mã SKU": "",
          "Màu sắc": "",
          "Kích thước": "",
          "Giá bán": 0,
          "Số lượng tồn kho": 0,
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

    if (Platform.OS === 'web') {
      XLSX.writeFile(workbook, "Danh_sach_san_pham.xlsx");
    } else {
      alert("Chức năng xuất ra file chỉ hỗ trợ trên thiết bị web.");
    }
    
    return true;
  } catch (error) {
    console.error("Export error:", error);
    throw error;
  }
};

export const importProductsFromExcel = async (file: File | any, onProgress?: (p: number) => void): Promise<{success: boolean, message: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          return resolve({ success: false, message: "File Excel không có dữ liệu." });
        }

        // Validate cơ bản
        const missingName = rows.find(r => !r["Tên sản phẩm"]);
        if (missingName) {
          return resolve({ success: false, message: "Lỗi: Có dòng thiếu 'Tên sản phẩm'." });
        }

        // Nhóm các dòng theo ID sản phẩm hoặc Tên sản phẩm
        const groupedProducts: Record<string, any> = {};

        for (const row of rows) {
          const groupKey = row["ID sản phẩm"] ? String(row["ID sản phẩm"]) : row["Tên sản phẩm"].trim();
          
          if (!groupedProducts[groupKey]) {
            groupedProducts[groupKey] = {
              id: row["ID sản phẩm"] ? String(row["ID sản phẩm"]) : undefined,
              name: row["Tên sản phẩm"].trim(),
              short_description: row["Mô tả ngắn"] || "",
              price: parseInt(String(row["Giá cơ bản"]).replace(/\D/g, "")) || 0,
              is_active: row["Trạng thái"] !== "Ngưng bán",
              variants: []
            };
          }

          if (row["Mã SKU"] || row["Màu sắc"] || row["Kích thước"]) {
            groupedProducts[groupKey].variants.push({
              id: row["ID SKU"] ? String(row["ID SKU"]) : undefined,
              sku: row["Mã SKU"] ? String(row["Mã SKU"]) : `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              color: row["Màu sắc"] ? String(row["Màu sắc"]) : null,
              size: row["Kích thước"] ? String(row["Kích thước"]) : null,
              price: parseInt(String(row["Giá bán"]).replace(/\D/g, "")) || 0,
              stock: parseInt(String(row["Số lượng tồn kho"]).replace(/\D/g, "")) || 0,
            });
          }
        }

        const productGroups = Object.values(groupedProducts);
        const total = productGroups.length;
        
        for (let i = 0; i < total; i++) {
          const group = productGroups[i];
          let productId = group.id;

          // 1. Upsert Sản phẩm
          const productData: any = {
            name: group.name,
            short_description: group.short_description,
            price: group.price,
            is_active: group.is_active,
          };
          if (productId) productData.id = productId;

          // Dùng insert nếu ko có ID, upsert nếu có ID
          if (productId) {
            const { error: pErr } = await supabase.from('products').upsert(productData);
            if (pErr) throw pErr;
          } else {
            const { data: pData, error: pErr } = await supabase.from('products').insert(productData).select().single();
            if (pErr) throw pErr;
            productId = pData.id;
          }

          // 2. Upsert Variants
          if (group.variants.length > 0) {
            const variantsToUpsert = group.variants.map((v: any) => {
              const vData: any = {
                product_id: productId,
                sku: v.sku,
                color: v.color,
                size: v.size,
                price: v.price,
                stock: v.stock,
              };
              if (v.id) vData.id = v.id;
              return vData;
            });
            
            const existingVars = variantsToUpsert.filter((v:any) => v.id);
            const newVars = variantsToUpsert.filter((v:any) => !v.id);

            if (existingVars.length > 0) {
              const { error: vUpdErr } = await supabase.from('product_variants').upsert(existingVars);
              if (vUpdErr) throw vUpdErr;
            }
            if (newVars.length > 0) {
              const { error: vInsErr } = await supabase.from('product_variants').insert(newVars);
              if (vInsErr) throw vInsErr;
            }
          }

          if (onProgress) onProgress(((i + 1) / total) * 100);
        }

        resolve({ success: true, message: "Nhập dữ liệu thành công!" });
      } catch (err: any) {
        console.error("Import error:", err);
        resolve({ success: false, message: "Lỗi tệp hoặc cấu trúc không hợp lệ: " + err.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: "Không thể đọc file." });
    };

    reader.readAsBinaryString(file);
  });
};
