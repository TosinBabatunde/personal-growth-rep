import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  User,
  LogOut,
  Calendar,
  BarChart3,
  Info,
  Heart,
} from 'lucide-react-native';

interface CycleHistory {
  id: string;
  status: string;
  requests_sent: number;
  submissions_received: number;
  started_at: string;
  completed_at: string | null;
  next_cycle_available_at: string | null;
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cycles, setCycles] = useState<CycleHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycles();
  }, [profile?.id]);

  const loadCycles = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedback_cycles')
        .select('*')
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        try {
          await signOut();
        } catch (error: any) {
          window.alert(error.message || 'Failed to sign out');
        }
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'cooldown':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cooldown':
        return 'Cooldown';
      default:
        return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
    >
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <User size={32} color="#FF6B6B" strokeWidth={2} />
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.phone}>{profile?.phone_number}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Growth</Text>
        <View style={styles.infoCard}>
          <Heart size={20} color="#FF6B6B" strokeWidth={2} />
          <Text style={styles.infoText}>
            Growth is a safe space for receiving honest, thoughtful feedback from
            people you trust. All feedback is anonymous and aggregated to protect
            your emotional wellbeing.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#111827" strokeWidth={2} />
          <Text style={styles.sectionTitle}>Feedback Cycle History</Text>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : cycles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feedback cycles yet</Text>
          </View>
        ) : (
          cycles.map((cycle) => (
            <View key={cycle.id} style={styles.cycleCard}>
              <View style={styles.cycleHeader}>
                <Text style={styles.cycleDate}>
                  Started {new Date(cycle.started_at).toLocaleDateString()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(cycle.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(cycle.status) },
                    ]}
                  >
                    {getStatusText(cycle.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.cycleStats}>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>{cycle.requests_sent}</Text>
                  <Text style={styles.cycleStatLabel}>Requests</Text>
                </View>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>
                    {cycle.submissions_received}
                  </Text>
                  <Text style={styles.cycleStatLabel}>Responses</Text>
                </View>
              </View>
              {cycle.completed_at && (
                <Text style={styles.completedText}>
                  Completed {new Date(cycle.completed_at).toLocaleDateString()}
                </Text>
              )}
              {cycle.next_cycle_available_at &&
                new Date(cycle.next_cycle_available_at) > new Date() && (
                  <Text style={styles.cooldownText}>
                    Next cycle available{' '}
                    {new Date(cycle.next_cycle_available_at).toLocaleDateString()}
                  </Text>
                )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color="#111827" strokeWidth={2} />
          <Text style={styles.sectionTitle}>Your Stats</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cycles.length}</Text>
            <Text style={styles.statLabel}>Total Cycles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {cycles.reduce((sum, c) => sum + c.requests_sent, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {cycles.reduce((sum, c) => sum + c.submissions_received, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Responses</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#EF4444" strokeWidth={2} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Growth is about progress, not perfection. Keep learning and growing at
          your own pace.
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  infoCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cycleStats: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cycleStat: {
    alignItems: 'center',
  },
  cycleStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cycleStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  completedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  cooldownText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
