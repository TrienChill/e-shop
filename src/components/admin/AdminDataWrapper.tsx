import React, { ReactNode } from 'react';
import { Pressable, PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(Pressable, { className: 'style' });

interface AdminDataWrapperProps extends Omit<PressableProps, 'className'> {
  children: ReactNode;
  className?: string;
}

export const AdminDataWrapper: React.FC<AdminDataWrapperProps> = ({ 
  children, 
  onPress, 
  className = "", 
  ...props 
}) => (
  <Pressable
    onPress={onPress}
    className={`
      flex-row items-center p-4 bg-white border-b border-gray-100 border-l-4 border-l-transparent
      web:transition-all web:duration-200
      hover:bg-slate-50 web:cursor-pointer
      hover:border-l-blue-500
      ${className}
    `}
    {...props}
  >
    {children}
  </Pressable>
);
