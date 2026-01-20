import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react-native';

export default function CompleteProfileScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { updateProfile, profile } = useAuth();

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        full_name: name.trim(),
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Sparkles size={48} color="#10B981" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Let's start with your name. This helps people recognize their
            feedback request from you.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Get Started'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your feedback journey starts here. Remember, growth is a continuous
            process, and every step forward matters.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
