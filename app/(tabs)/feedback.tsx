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
import {
  Users,
  CheckCircle2,
  Clock,
  Share2,
} from 'lucide-react-native';

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

  // ✅ Key: tab bar height + safe area + a little breathing room
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
      const { data: cycleData, error: cycleError } = await supabase
        .from('feedback_cycles')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError) throw cycleError;
      setCycle(cycleData);

      if (cycleData) {
        const { data: requestsData, error: requestsError } = await supabase
          .from('feedback_requests')
          .select('*')
          .eq('cycle_id', cycleData.id)
          .order('sent_at', { ascending: false });

        if (requestsError) throw requestsError;
        setRequests(requestsData || []);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const getAppUrl = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
      }
    }

    const configuredUrl = process.env.EXPO_PUBLIC_APP_URL;
    if (configuredUrl && configuredUrl.trim() !== '') {
      return configuredUrl;
    }

    Alert.alert(
      'Configuration Required',
      'Please set EXPO_PUBLIC_APP_URL in your .env file to your deployed web URL (e.g., https://yourapp.bolt.new or your custom domain)'
    );
    return 'https://example.com';
  };

  const handleSendRequest = async () => {
    setErrorMessage('');

    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter a contact name or identifier');
      return;
    }

    if (!cycle) {
      setErrorMessage('No active feedback cycle');
      return;
    }

    if (cycle.requests_sent >= 50) {
      setErrorMessage('You have reached the maximum of 50 requests per cycle');
      return;
    }

    setSending(true);
    try {
      const normalizedPhone = phoneNumber.trim();

      const { data: allRequests, error: checkError } = await supabase
        .from('feedback_requests')
        .select('id, unique_token, expires_at, status, rater_phone_number')
        .eq('cycle_id', cycle.id)
        .gte('expires_at', new Date().toISOString());

      if (checkError) throw checkError;

      const normalizeForComparison = (str: string) => {
        return str.replace(/[\s\-\(\)\.#]/g, '').toLowerCase();
      };

      const normalizedInput = normalizeForComparison(normalizedPhone);
      const matchingRequests =
        allRequests?.filter(
          (req) => normalizeForComparison(req.rater_phone_number) === normalizedInput
        ) || [];

      if (matchingRequests.length > 0) {
        const existingNames = matchingRequests
          .map((req) => `"${req.rater_phone_number}"`)
          .join(', ');
        setErrorMessage(
          `You already have a request for a contact with a similar name: ${existingNames}. To avoid confusion, please add more detail (e.g., "${phoneNumber.trim()} Smith" or "${phoneNumber.trim()} (work)").`
        );
        setSending(false);
        return;
      }

      const finalContactName = phoneNumber.trim();

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const cleanedName = finalContactName.replace(/\s+/g, ' ').trim();
      const verificationHint =
        cleanedName.length >= 4 ? cleanedName.slice(-4).toLowerCase() : cleanedName.toLowerCase();

      const { data, error } = await supabase
        .from('feedback_requests')
        .insert({
          cycle_id: cycle.id,
          sender_id: profile!.id,
          rater_phone_number: finalContactName,
          unique_token: token,
          expires_at: expiresAt.toISOString(),
          verification_hint: verificationHint,
        })
        .select()
        .single();

      if (error) throw error;

      const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;

      const verificationCode = cleanedName.length >= 4 ? cleanedName.slice(-4) : cleanedName;

      try {
        const shareResult = await Share.share({
          message: `Hi! I'm working on personal growth and would really value your honest feedback. Could you take a few minutes to share your thoughts?\n\n${feedbackUrl}\n\nVerification code: ${verificationCode}`,
          title: 'Feedback Request',
        });

        if (shareResult.action === Share.sharedAction) {
          setPhoneNumber('');
          loadData();
        }
      } catch (shareError: any) {
        if (Platform.OS === 'web' && navigator.clipboard) {
          navigator.clipboard.writeText(feedbackUrl);
          Alert.alert(
            'Link Created!',
            `Link copied to clipboard! Share it with ${finalContactName} via text, email, or messaging app.\n\nIMPORTANT: Tell them to enter this verification code when opening the link: ${verificationCode}\n\nThe link expires in 30 days.`
          );
          setPhoneNumber('');
          loadData();
        } else {
          Alert.alert(
            'Link Created!',
            `Your feedback link:\n\n${feedbackUrl}\n\nIMPORTANT: Tell ${finalContactName} to enter this verification code when opening the link: ${verificationCode}\n\nThe link is single-use and expires in 30 days.`
          );
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create request');
    } finally {
      setSending(false);
    }
  };

  const shareLink = async (token: string, contactName: string) => {
    Alert.alert(
      'Share Again?',
      `Are you sure you want to share this link again with ${contactName}?\n\nIf you already sent it to them, sending it multiple times may be confusing. Each person should only receive one link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share Again',
          onPress: async () => {
            const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;

            const cleanedContactName = contactName.replace(/\s+/g, ' ').trim();
            const verCode = cleanedContactName.length >= 4
              ? cleanedContactName.slice(-4)
              : cleanedContactName;

            if (Platform.OS === 'web' && navigator.clipboard) {
              navigator.clipboard.writeText(feedbackUrl);
              Alert.alert(
                'Link Copied',
                `Feedback link copied to clipboard. Share it with your contact and remind them to enter this verification code: ${verCode}`
              );
              return;
            }

            try {
              await Share.share({
                message: `Hi! I'm working on personal growth and would really value your honest feedback. Could you take a few minutes to share your thoughts?\n\n${feedbackUrl}\n\nVerification code: ${verCode}`,
                title: 'Feedback Request',
              });
            } catch (error) {
              console.error('Error sharing:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingBottom: bottomPad }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!cycle) {
    return (
      <View style={[styles.emptyContainer, { paddingBottom: bottomPad }]}>
        <Users size={48} color="#9CA3AF" strokeWidth={2} />
        <Text style={styles.emptyTitle}>No Active Cycle</Text>
        <Text style={styles.emptyText}>
          Start a new feedback cycle from the Home tab to begin sending requests.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Request Feedback</Text>
        <Text style={styles.subtitle}>
          Send requests to people you trust for honest, constructive feedback
        </Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cycle.requests_sent}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{50 - cycle.requests_sent}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cycle.submissions_received}</Text>
            <Text style={styles.statLabel}>Responses</Text>
          </View>
        </View>
      </View>

      {cycle.requests_sent < 50 && (
        <View style={styles.sendCard}>
          <Text style={styles.sendTitle}>Send Feedback Request</Text>
          <Text style={styles.sendDescription}>
            Enter a contact name or identifier. Be specific to distinguish contacts (e.g., "David Smith" or "David (work)").
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g., Sarah Johnson or Mike (college)"
            placeholderTextColor="#9CA3AF"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (errorMessage) setErrorMessage('');
            }}
            keyboardType="default"
          />

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={sending}
          >
            <Share2 size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.sendButtonText}>
              {sending ? 'Creating Link...' : 'Share Feedback Request'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Opens your phone's share menu to send via SMS, WhatsApp, email, etc. Each link is single-use and expires in 30 days.
          </Text>
        </View>
      )}

      {requests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Your Requests</Text>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestPhone}>{request.rater_phone_number}</Text>
                  <Text style={styles.requestDate}>
                    Sent {new Date(request.sent_at).toLocaleDateString()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    request.status === 'completed' && styles.statusCompleted,
                  ]}
                >
                  {request.status === 'completed' ? (
                    <CheckCircle2 size={16} color="#10B981" strokeWidth={2} />
                  ) : (
                    <Clock size={16} color="#F59E0B" strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.statusText,
                      request.status === 'completed' && styles.statusTextCompleted,
                    ]}
                  >
                    {request.status === 'completed' ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </View>

              {request.status !== 'completed' && (
                <TouchableOpacity
                  style={styles.reshareButton}
                  onPress={() => shareLink(request.unique_token, request.rater_phone_number)}
                >
                  <Share2 size={18} color="#FF6B6B" strokeWidth={2} />
                  <Text style={styles.reshareButtonText}>
                    {Platform.OS === 'web' ? 'Copy Link' : 'Share Again'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Privacy & Safety</Text>
        <Text style={styles.infoText}>
          Your feedback will be aggregated and shown only after receiving 10
          responses. Individual responses remain anonymous to protect both you and
          your raters.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  sendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sendTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sendDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  requestsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestPhone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    gap: 4,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  statusTextCompleted: {
    color: '#065F46',
  },
  reshareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  reshareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
});




// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   TextInput,
//   Alert,
//   RefreshControl,
//   Share,
//   Platform,
// } from 'react-native';
// import { useFocusEffect } from 'expo-router';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/lib/supabase';
// import { Users, CheckCircle2, Clock, Share2 } from 'lucide-react-native';

// interface FeedbackCycle {
//   id: string;
//   status: string;
//   requests_sent: number;
//   submissions_received: number;
// }

// interface FeedbackRequest {
//   id: string;
//   rater_phone_number: string;
//   status: string;
//   sent_at: string;
//   unique_token: string;
// }

// export default function FeedbackScreen() {
//   const { profile } = useAuth();
//   const insets = useSafeAreaInsets();
//   const tabBarHeight = useBottomTabBarHeight();
//   const bottomPad = tabBarHeight + Math.max(16, insets.bottom);

//   const [cycle, setCycle] = useState<FeedbackCycle | null>(null);
//   const [requests, setRequests] = useState<FeedbackRequest[]>([]);
//   const [phoneNumber, setPhoneNumber] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');

//   const loadData = async () => {
//     if (!profile?.id) {
//       setLoading(false);
//       setRefreshing(false);
//       return;
//     }

//     try {
//       const { data: cycleData } = await supabase
//         .from('feedback_cycles')
//         .select('*')
//         .eq('user_id', profile.id)
//         .eq('status', 'active')
//         .maybeSingle();

//       setCycle(cycleData);

//       if (cycleData) {
//         const { data: requestsData } = await supabase
//           .from('feedback_requests')
//           .select('*')
//           .eq('cycle_id', cycleData.id)
//           .order('sent_at', { ascending: false });

//         setRequests(requestsData || []);
//       } else {
//         setRequests([]);
//       }
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, [profile?.id]);

//   useFocusEffect(
//     React.useCallback(() => {
//       loadData();
//     }, [profile?.id])
//   );

//   const onRefresh = () => {
//     setRefreshing(true);
//     loadData();
//   };

//   const getAppUrl = () => {
//     if (Platform.OS === 'web' && typeof window !== 'undefined') {
//       return window.location.origin;
//     }
//     return process.env.EXPO_PUBLIC_APP_URL || 'https://example.com';
//   };

//   const buildShareMessage = (
//     senderName: string | undefined,
//     feedbackUrl: string,
//     verificationCode: string
//   ) =>
//     `Hello,\n\n` +
//     `I’m taking a brave step toward growing in self-awareness, and I’d be grateful to have you ` +
//     `alongside me in that process. I’m inviting you to share honest, thoughtful feedback on a few ` +
//     `personal traits. Your kindness and honesty mean a lot to me.\n\n` +
//     `All responses are anonymous and will be aggregated with others.\n\n` +
//     `Thank you,\n` +
//     `– ${senderName || 'Someone'}\n\n` +
//     `${feedbackUrl}\n\n` +
//     `Verification code: ${verificationCode}`;

//   const handleSendRequest = async () => {
//     setErrorMessage('');

//     if (!phoneNumber.trim() || !cycle) return;

//     setSending(true);
//     try {
//       const cleanedName = phoneNumber.trim();
//       const verificationCode =
//         cleanedName.length >= 4 ? cleanedName.slice(-4) : cleanedName;

//       const token =
//         Math.random().toString(36).substring(2) + Date.now().toString(36);

//       const expiresAt = new Date();
//       expiresAt.setDate(expiresAt.getDate() + 30);

//       await supabase.from('feedback_requests').insert({
//         cycle_id: cycle.id,
//         sender_id: profile!.id,
//         rater_phone_number: cleanedName,
//         unique_token: token,
//         expires_at: expiresAt.toISOString(),
//         verification_hint: verificationCode.toLowerCase(),
//       });

//       const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;
//       const message = buildShareMessage(
//         profile?.full_name,
//         feedbackUrl,
//         verificationCode
//       );

//       try {
//         const result = await Share.share({
//           title: 'Feedback Request',
//           message,
//         });

//         if (result.action === Share.sharedAction) {
//           setPhoneNumber('');
//           loadData();
//         }
//       } catch {
//         if (Platform.OS === 'web' && navigator.clipboard) {
//           await navigator.clipboard.writeText(feedbackUrl);
//           Alert.alert(
//             'Link Copied',
//             `Share this link and verification code:\n\n${verificationCode}`
//           );
//         }
//       }
//     } catch (e: any) {
//       setErrorMessage(e.message || 'Failed to send request');
//     } finally {
//       setSending(false);
//     }
//   };

//   const shareLink = async (token: string, contactName: string) => {
//     const cleaned = contactName.trim();
//     const verificationCode =
//       cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;

//     const feedbackUrl = `${getAppUrl()}/feedback/submit?token=${token}`;
//     const message = buildShareMessage(
//       profile?.full_name,
//       feedbackUrl,
//       verificationCode
//     );

//     try {
//       await Share.share({
//         title: 'Feedback Request',
//         message,
//       });
//     } catch {}
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text>Loading…</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={{ paddingBottom: bottomPad }}
//       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//     >
//       <Text style={styles.title}>Request Feedback</Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Contact name"
//         value={phoneNumber}
//         onChangeText={setPhoneNumber}
//       />

//       <TouchableOpacity
//         style={[styles.sendButton, sending && styles.sendButtonDisabled]}
//         onPress={handleSendRequest}
//         disabled={sending}
//       >
//         <Share2 size={18} color="#fff" />
//         <Text style={styles.sendButtonText}>
//           {sending ? 'Sending…' : 'Send Request'}
//         </Text>
//       </TouchableOpacity>

//       {requests.map((r) => (
//         <View key={r.id} style={styles.requestCard}>
//           <Text>{r.rater_phone_number}</Text>
//           {r.status !== 'completed' && (
//             <TouchableOpacity onPress={() => shareLink(r.unique_token, r.rater_phone_number)}>
//               <Text style={styles.reshare}>Share Again</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       ))}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
//   input: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     marginBottom: 12,
//   },
//   sendButton: {
//     backgroundColor: '#FF6B6B',
//     padding: 14,
//     borderRadius: 12,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   sendButtonDisabled: { opacity: 0.6 },
//   sendButtonText: { color: '#fff', fontWeight: '600' },
//   requestCard: {
//     backgroundColor: '#fff',
//     padding: 14,
//     borderRadius: 12,
//     marginTop: 12,
//   },
//   reshare: { color: '#FF6B6B', marginTop: 8 },
// });
