import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatBox } from './ChatBox';

export const ChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setIsChatOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ChatBox 
        visible={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 80, // Cách đáy nhiều hơn trên app để tránh thanh điều hướng
    right: 24,
    zIndex: 9998,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF', // Màu xanh chủ đạo
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
