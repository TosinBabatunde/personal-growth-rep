import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, CheckCircle } from 'lucide-react-native';

export default function ThankYouScreen() {
  const { senderName } = useLocalSearchParams<{ senderName: string }>();
  const router = useRouter();
  const displayName = senderName || 'them';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={64} color="#10B981" strokeWidth={2} />
        </View>

        <Text style={styles.title}>Thank You!</Text>

        <Text style={styles.message}>
          Your feedback has been submitted successfully. Your thoughtful insights will help {displayName} grow.
        </Text>

        <View style={styles.infoCard}>
          <Heart size={24} color="#FF6B6B" strokeWidth={2} />
          <Text style={styles.infoText}>
            Your responses are completely anonymous and will be combined with others to create meaningful, encouraging insights.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Thank you for taking the time to help {displayName} grow. Your kindness and honesty make a real difference.
        </Text>
      </View>
    </View>
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
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
