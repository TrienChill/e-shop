export const encodeOrderId = (id: string | number | undefined | null): string => {
  if (!id) return "N/A";
  const strId = String(id);
  
  // Remove dashes
  const cleanId = strId.replace(/-/g, '');
  
  if (cleanId.length <= 8) {
     return `ORD-${cleanId.toUpperCase()}`;
  }

  const last8 = cleanId.slice(-8).toUpperCase();
  
  // Hex to Base36
  const decimalValue = parseInt(last8, 16);
  if (isNaN(decimalValue)) {
     return `ORD-${last8}`;
  }
  const base36 = decimalValue.toString(36).toUpperCase().padStart(6, '0');

  return `ORD-${base36}`;
};
