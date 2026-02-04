import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  Send,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';

interface FeedbackCycle {
  id: string;
  status: string;
  requests_sent: number;
  submissions_received: number;
  started_at: string;
  next_cycle_available_at: string | null;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [cycle, setCycle] = useState<FeedbackCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Keep content above the tab bar + safe area
  const bottomPad = tabBarHeight + Math.max(16, insets.bottom);

  // ✅ Extra-safe first name extraction
  const firstName = useMemo(() => {
    const fullName = profile?.full_name ?? '';
    const cleaned = fullName.trim().replace(/\s+/g, ' ');
    if (!cleaned) return 'there';
    const [first] = cleaned.split(' ');
    return first || 'there';
  }, [profile?.full_name]);

  const loadCycle = async () => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedback_cycles')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCycle(data);
    } catch (error) {
      console.error('Error loading cycle:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCycle();
  };

  const handleStartNewCycle = async () => {
    if (!profile?.id) {
      Alert.alert('Error', 'Profile not loaded. Please try again.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedback_cycles')
        .insert({
          user_id: profile.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cycle:', error);
        throw error;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ current_cycle_id: data.id })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
      }

      setCycle(data);

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push('/(tabs)/feedback');
    } catch (error: any) {
      console.error('Error starting cycle:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to start new cycle. Please try again.'
      );
    }
  };

  const canStartNewCycle = () => {
    if (!cycle) return true;
    if (cycle.status === 'active') return false;
    if (cycle.next_cycle_available_at) {
      return new Date(cycle.next_cycle_available_at) <= new Date();
    }
    return true;
  };

  const getNextMilestone = () => {
    if (!cycle) return 10;
    const current = cycle.submissions_received;
    if (current < 10) return 10;
    if (current < 20) return 20;
    if (current < 30) return 30;
    if (current < 40) return 40;
    return 50;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingBottom: bottomPad }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        {/* ✅ Text wraps independently; icon sits in fixed wrapper */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.name} numberOfLines={2}>
              Hello, {firstName}
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <Heart size={32} color="#FF6B6B" strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Your journey to growth through trusted feedback
        </Text>
      </View>

      {!cycle || cycle.status === 'completed' || cycle.status === 'cooldown' ? (
        <View style={styles.emptyState}>
          {cycle?.status === 'cooldown' && cycle.next_cycle_available_at ? (
            <>
              <Clock size={48} color="#9CA3AF" strokeWidth={2} />
              <Text style={styles.emptyTitle}>In Cooldown Period</Text>
              <Text style={styles.emptyText}>
                Your next feedback cycle will be available on{' '}
                {new Date(cycle.next_cycle_available_at).toLocaleDateString()}
              </Text>
              <Text style={styles.encouragement}>
                Take this time to reflect on your recent feedback and practice
                the growth strategies you've learned.
              </Text>
            </>
          ) : (
            <>
              <Send size={48} color="#FF6B6B" strokeWidth={2} />
              <Text style={styles.emptyTitle}>Start Your Feedback Journey</Text>
              <Text style={styles.emptyText}>
                Request feedback from up to 50 people you trust to understand
                how you're perceived and where you can grow.
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartNewCycle}
                disabled={!canStartNewCycle()}
              >
                <Text style={styles.startButtonText}>Start New Cycle</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={24} color="#3B82F6" strokeWidth={2} />
              <Text style={styles.statValue}>{cycle.requests_sent}</Text>
              <Text style={styles.statLabel}>Requests Sent</Text>
              <Text style={styles.statSubtext}>of 50 max</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={24} color="#10B981" strokeWidth={2} />
              <Text style={styles.statValue}>{cycle.submissions_received}</Text>
              <Text style={styles.statLabel}>Responses</Text>
              <Text style={styles.statSubtext}>
                Next at {getNextMilestone()}
              </Text>
            </View>
          </View>

          {cycle.submissions_received > 0 && (
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Progress Update</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(cycle.submissions_received / getNextMilestone()) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {getNextMilestone() - cycle.submissions_received} more responses
                until your next feedback summary
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/feedback')}
          >
            <View style={styles.actionContent}>
              <Send size={24} color="#FF6B6B" strokeWidth={2} />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Send More Requests</Text>
                <Text style={styles.actionDescription}>
                  Invite more trusted contacts to provide feedback
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {cycle.submissions_received >= 10 && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/growth')}
            >
              <View style={styles.actionContent}>
                <TrendingUp size={24} color="#10B981" strokeWidth={2} />
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>View Your Growth</Text>
                  <Text style={styles.actionDescription}>
                    See insights and track your progress
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Remember</Text>
        <Text style={styles.infoText}>
          Feedback is a gift from people who care about your growth. Every
          response helps you understand yourself better and become the person
          you aspire to be.
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
  header: {
    marginBottom: 24,
    paddingTop: 40,
  },

  // ✅ CHANGES: bring icon closer to "Hello, FirstName"
greetingRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  justifyContent: 'flex-start',
  // flexWrap: 'wrap',
},

greetingTextWrap: {
  flexShrink: 1,      // allows wrapping
  flex: 1,
  // maxWidth: '78%',    // prevents the name from bulldozing the icon
},

  name: {
  fontSize: 32,
  fontWeight: '700',
  color: '#111827',
  lineHeight: 38,
  flexShrink: 1,
},

iconContainer: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: '#FEF2F2',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 6,  
},

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  encouragement: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
});
