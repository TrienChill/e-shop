import React, { forwardRef } from "react";

// Khai báo kiểu dữ liệu cho Hoá đơn
export interface InvoiceItem {
    id: string;
    product_name: string;
    quantity: number;
    price: number;
}

export interface InvoiceOrderData {
    id: string;
    created_at: string | Date;
    receiver_name: string;
    phone_contact: string;
    shipping_address: string | null;
    items: InvoiceItem[];
    shipping_fee?: number;
    discount?: number;
    total_amount: number;
}

interface Props {
    order: InvoiceOrderData | null;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, Props>(({ order }, ref) => {
    if (!order) return null;

    // Format tiền tệ VNĐ
    const formatCurrency = (amount: number) => {
        return Number(amount).toLocaleString("vi-VN") + "đ";
    };

    // Format Date
    const invoiceDate = new Date().toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (
        // 'print:p-0' bỏ qua margin/padding bên ngoài khi in
        <div ref={ref} className="bg-white p-8 w-[210mm] min-h-[148mm] text-black font-sans mx-auto shadow-sm print:shadow-none print:w-full print:p-4">
            {/* 1. Header (Logo & Tên Shop) */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase text-blue-600 tracking-wider">E-SHOP ONLINE</h1>
                    <p className="text-sm text-gray-500 mt-1">123 Đường B, Phường C, TP HCM</p>
                    <p className="text-sm text-gray-500">Hotline: 0123.456.789</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">HÓA ĐƠN BÁN HÀNG</h2>
                    <p className="text-sm text-gray-500 mt-1">Mã HĐ: #{String(order.id).slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">Ngày in: {invoiceDate}</p>
                </div>
            </div>

            {/* 2. Customer Info */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 uppercase">Thông tin khách hàng:</h3>
                <p className="text-sm text-gray-700"><span className="font-medium">Người nhận:</span> {order.receiver_name}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Điện thoại:</span> {order.phone_contact}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Địa chỉ:</span> {order.shipping_address || "Tại cửa hàng"}</p>
            </div>

            {/* 3. DataTable */}
            <table className="w-full mb-6 border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="py-2 px-2 text-left text-sm font-bold text-gray-700 w-12">STT</th>
                        <th className="py-2 px-2 text-left text-sm font-bold text-gray-700">Tên sản phẩm</th>
                        <th className="py-2 px-2 text-center text-sm font-bold text-gray-700 w-20">SL</th>
                        <th className="py-2 px-4 text-right text-sm font-bold text-gray-700 w-32">Đơn giá</th>
                        <th className="py-2 px-2 text-right text-sm font-bold text-gray-700 w-32">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items?.length > 0 ? (
                        order.items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-3 px-2 text-sm text-gray-700">{index + 1}</td>
                                <td className="py-3 px-2 text-sm text-gray-700">{item.product_name}</td>
                                <td className="py-3 px-2 text-sm text-center text-gray-700">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(item.price)}</td>
                                <td className="py-3 px-2 text-sm text-right text-gray-700">{formatCurrency(item.quantity * item.price)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="py-4 text-center text-gray-500 italic">Không có chi tiết sản phẩm</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* 4. Total Summary */}
            <div className="flex justify-end mb-8">
                <div className="w-1/2">
                    <div className="flex justify-between py-1 text-sm text-gray-600">
                        <span>Tổng tiền hàng:</span>
                        <span>{formatCurrency(order.total_amount - (order.shipping_fee || 0) + (order.discount || 0))}</span>
                    </div>
                    {order.shipping_fee ? (
                        <div className="flex justify-between py-1 text-sm text-gray-600 border-b border-gray-200 pb-2">
                            <span>Phí vận chuyển:</span>
                            <span>{formatCurrency(order.shipping_fee)}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between py-3 text-lg font-bold text-gray-800">
                        <span>Tổng thanh toán:</span>
                        <span className="text-blue-600">{formatCurrency(order.total_amount)}</span>
                    </div>
                </div>
            </div>

            {/* 5. Footer */}
            <div className="text-center mt-12 text-sm text-gray-500 italic">
                <p>Cảm ơn quý khách đã tin tưởng và mua sắm tại E-Shop!</p>
                <p>Mọi thắc mắc vui lòng liên hệ hotline để được hỗ trợ: 0123.456.789</p>
            </div>
        </div>
    );
});

InvoiceTemplate.displayName = "InvoiceTemplate";
