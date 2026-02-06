import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, Clock, Share2 } from 'lucide-react-native';

interface FeedbackCycle {
  id: string;
  status: string;
  requests_sent: number;
  submissions_received: number;
}

interface FeedbackRequest {
  id: string;
  rater_phone_number: string;
  status: string;
  sent_at: string;
  unique_token: string;
}

export default function FeedbackScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bottomPad = tabBarHeight + Math.max(16, insets.bottom);

  const [cycle, setCycle] = useState<FeedbackCycle | null>(null);
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data: cycleData } = await supabase
        .from('feedback_cycles')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      setCycle(cycleData);

      if (cycleData) {
        const { data: requestsData } = await supabase
          .from('feedback_requests')
          .select('*')
          .eq('cycle_id', cycleData.id)
          .order('sent_at', { ascending: false });

        setRequests(requestsData || []);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [profile?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getAppUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.EXPO_PUBLIC_APP_URL || 'https://example.com';
  };

  const buildShareMessage = (
    senderName: string | undefined,
    feedbackUrl: string,
    verificationCode: string
  ) =>
    `Hello,\n\n` +
    `I’m taking a brave step toward growing in self-awareness, and I’d be grateful to have you ` +
    `alongside me in that process. I’m inviting you to share honest, thoughtful feedback on a few ` +
    `personal traits. Your kindness and honesty mean a lot to me.\n\n` +
    `All responses are anonymous and will be aggregated with others.\n\n` +
    `Thank you,\n` +
    `– ${senderName || 'Someone'}\n\n` +
    `${feedbackUrl}\n\n` +
    `Verification code: ${verificationCode}`;

  const handleSendRequest = async () => {
    setErrorMessage('');

    if (!phoneNumber.trim() || !cycle) return;

    setSending(true);
    try {
      const cleanedName = phoneNumber.trim();
      const verificationCode =
        cleanedName.length >= 4 ? cleanedName.slice(-4) : cleanedName;

      const token =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase.from('feedback_requests').insert({
        cycle_id: cycle.id,
        sender_id: profile!.id,
        rater_phone_number: cleanedName,
        unique_token: token,
        expires_at: expiresAt.toISOString(),
        verification_hint: verificationCode.toLowerCase(),
      });

      const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;
      const message = buildShareMessage(
        profile?.full_name,
        feedbackUrl,
        verificationCode
      );

      try {
        const result = await Share.share({
          title: 'Feedback Request',
          message,
        });

        if (result.action === Share.sharedAction) {
          setPhoneNumber('');
          loadData();
        }
      } catch {
        if (Platform.OS === 'web' && navigator.clipboard) {
          await navigator.clipboard.writeText(feedbackUrl);
          Alert.alert(
            'Link Copied',
            `Share this link and verification code:\n\n${verificationCode}`
          );
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const shareLink = async (token: string, contactName: string) => {
    const cleaned = contactName.trim();
    const verificationCode =
      cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;

    const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;
    const message = buildShareMessage(
      profile?.full_name,
      feedbackUrl,
      verificationCode
    );

    try {
      await Share.share({
        title: 'Feedback Request',
        message,
      });
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Request Feedback</Text>

      <TextInput
        style={styles.input}
        placeholder="Contact name"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <TouchableOpacity
        style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        onPress={handleSendRequest}
        disabled={sending}
      >
        <Share2 size={18} color="#fff" />
        <Text style={styles.sendButtonText}>
          {sending ? 'Sending…' : 'Send Request'}
        </Text>
      </TouchableOpacity>

      {requests.map((r) => (
        <View key={r.id} style={styles.requestCard}>
          <Text>{r.rater_phone_number}</Text>
          {r.status !== 'completed' && (
            <TouchableOpacity onPress={() => shareLink(r.unique_token, r.rater_phone_number)}>
              <Text style={styles.reshare}>Share Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
  requestCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  reshare: { color: '#FF6B6B', marginTop: 8 },
});
