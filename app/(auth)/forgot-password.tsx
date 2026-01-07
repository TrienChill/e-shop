
import { ArrowLeft, ArrowRight, Lock, Mail, RotateCcw } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Colors Palette based on design
const COLORS = {
  primary: '#6467f2',
  primaryHover: '#5356d6',
  background: '#f6f6f8',
  white: '#ffffff',
  textDark: '#111118',
  textGray: '#6b7280', // Approx gray-600
  inputBorder: '#dbdbe6',
  placeholder: '#9ca3af',
  blobPurple: 'rgba(100, 103, 242, 0.05)',
  blobBlue: 'rgba(96, 165, 250, 0.05)',
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Background Decorators (Abstract Blobs) */}
      <View style={styles.backgroundBlobContainer} pointerEvents="none">
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              activeOpacity={0.7}
              onPress={() => console.log('Go Back')}
            >
              <ArrowLeft size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            
            {/* Hero Illustration */}
            <View style={styles.heroContainer}>
              {/* Glow Effect behind the box */}
              <View style={styles.heroGlow} />
              
              {/* Main White Box */}
              <View style={styles.heroBox}>
                {/* Decorative Dots */}
                <View style={styles.dotTopRight} />
                <View style={styles.dotBottomLeft} />

                {/* Icon Composition: Simulating the circular arrow with lock */}
                <View style={styles.iconWrapper}>
                  <RotateCcw size={80} color={COLORS.primary} strokeWidth={2.5} />
                  <View style={styles.lockIconOverlay}>
                     {/* Using a filled lock look by layering or just standard */}
                    <Lock size={32} color={COLORS.primary} strokeWidth={3} />
                  </View>
                </View>
              </View>
            </View>

            {/* Typography Section */}
            <View style={styles.textSection}>
              <Text style={styles.headline}>Forgot Password?</Text>
              <Text style={styles.subtext}>
                Dont worry! It happens. Please enter the email associated with your account.
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="jane@example.com"
                    placeholderTextColor={COLORS.textGray}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <View style={styles.inputIconContainer}>
                    <Mail size={20} color="#9ca3af" />
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.primaryButton} 
                activeOpacity={0.8}
                onPress={() => console.log('Send Reset Link')}
              >
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                <ArrowRight size={20} color={COLORS.white} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.footerButton} 
                activeOpacity={0.6}
                onPress={() => console.log('Back to Login')}
              >
                <ArrowLeft size={18} color={COLORS.textGray} />
                <Text style={styles.footerText}>Back to Login</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Background Blobs
  backgroundBlobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  blobTopRight: {
    position: 'absolute',
    top: -width * 0.2,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.blobPurple,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -width * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.blobBlue,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6', // gray-100
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Main Content
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Hero Section
  heroContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    backgroundColor: 'rgba(100, 103, 242, 0.15)',
    borderRadius: 90,
  },
  heroBox: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.white,
    borderRadius: 40, // 2.5rem approx
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    // Soft Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 8,
  },
  dotTopRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 103, 242, 0.3)',
  },
  dotBottomLeft: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 103, 242, 0.2)',
  },
  iconWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconOverlay: {
    position: 'absolute',
    top: 24, // Adjust to center inside the circle approx
  },

  // Typography
  textSection: {
    marginBottom: 40,
    alignItems: 'center',
    maxWidth: 320,
  },
  headline: {
    fontSize: 32,
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: COLORS.textGray,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Form
  formContainer: {
    width: '100%',
    maxWidth: 420,
    gap: 24, // Note: gap works in newer RN versions, use margin if supporting old
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
    marginLeft: 16,
  },
  inputWrapper: {
    position: 'relative',
    height: 64,
    width: '100%',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 32, // Full pill shape
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    paddingLeft: 24,
    paddingRight: 50, // Space for icon
    fontSize: 18,
    color: COLORS.textDark,
  },
  inputIconContainer: {
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    height: 64,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Glow shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textGray,
  },
});
