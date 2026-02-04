import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  Sparkles,
  CheckCircle,
  Circle,
  Award,
  Target,
} from 'lucide-react-native';

interface FeedbackSummary {
  id: string;
  submission_count: number;
  top_strengths: any;
  growth_opportunities: any;
  patterns: string;
  comparison_to_previous: string | null;
  generated_at: string;
  all_trait_scores?: any;
}

interface FeedbackCycle {
  id: string;
  submissions_received: number;
}

interface GrowthRecommendation {
  id: string;
  summary_id?: string | null;
  recommendation_type: string;
  title: string;
  description: string;
  is_completed: boolean;
}

interface TraitScore {
  trait: string;
  score: number;
}

/**
 * Generic narratives based on score + distribution.
 * No trait-specific copy, so it scales for every user.
 */
function getStrengthNarrative(score: number, percentile: number) {
  if (percentile >= 0.8 && score >= 4.2) return 'This consistently stands out as one of your strongest qualities.';
  if (score >= 4.0) return 'This is a clear strength that others regularly notice.';
  if (score >= 3.7) return 'This shows up positively, even if it is not always your top strength.';
  return 'This shows up sometimes, but is not yet a defining strength.';
}

function getGrowthNarrative(score: number, percentile: number) {
  if (percentile <= 0.2 && score <= 3.2) return 'This is a high-leverage area. Small improvements could make a noticeable difference.';
  if (score <= 3.6) return 'Developing this further could meaningfully improve how others experience you.';
  if (score <= 4.0) return 'This is already solid, but sharpening it could help.';
  return 'This is generally strong, but feedback suggests a bit of fine-tuning would help.';
}

function getBalancedTraitNarrative(score: number) {
  if (score >= 4.0) return 'Strong and steady, though not highlighted as a top strength this cycle.';
  if (score >= 3.5) return 'Stable overall. It may vary depending on the situation.';
  return 'Present, but not strongly felt by others yet.';
}

function getThemeIntro(count: number) {
  if (count >= 5) return 'Several people mentioned similar experiences:';
  if (count >= 3) return 'A few repeated patterns emerged:';
  return 'Some early patterns are starting to appear:';
}

export default function GrowthScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [summaries, setSummaries] = useState<FeedbackSummary[]>([]);
  const [cycle, setCycle] = useState<FeedbackCycle | null>(null);
  const [recommendations, setRecommendations] = useState<GrowthRecommendation[]>([]);
  const [remainingTraits, setRemainingTraits] = useState<TraitScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef = useRef(true);

  const bottomPad = useMemo(
    () => tabBarHeight + Math.max(16, insets.bottom),
    [tabBarHeight, insets.bottom]
  );

  const latestSummary = useMemo(() => (summaries.length > 0 ? summaries[0] : null), [summaries]);

  const allTraitScores: TraitScore[] = useMemo(() => {
    const raw = Array.isArray((latestSummary as any)?.all_trait_scores)
      ? (latestSummary as any).all_trait_scores
      : [];

    return raw
      .map((t: any) => ({ trait: String(t.trait), score: Number(t.score || 0) }))
      .filter((t: TraitScore) => t.trait);
  }, [latestSummary]);

  const traitScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    allTraitScores.forEach((t) => map.set(t.trait, t.score));
    return map;
  }, [allTraitScores]);

  const traitPercentileMap = useMemo(() => {
    // Percentile: 0 = lowest, 1 = highest
    const sorted = [...allTraitScores].sort((a, b) => a.score - b.score);
    const map = new Map<string, number>();
    const n = Math.max(sorted.length, 1);

    sorted.forEach((t, idx) => {
      const percentile = n === 1 ? 1 : idx / (n - 1);
      map.set(t.trait, percentile);
    });

    return map;
  }, [allTraitScores]);

  const themeBullets = useMemo(() => {
    const raw = latestSummary?.patterns || '';
    if (!raw) return [];
    const parts = raw.includes('\n') ? raw.split('\n') : raw.split('. ');
    return parts.map((p) => p.trim()).filter(Boolean).slice(0, 6);
  }, [latestSummary?.patterns]);

  const loadData = useCallback(async () => {
    if (!profile?.id) {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    try {
      const { data: cycleData, error: cycleError } = await supabase
        .from('feedback_cycles')
        .select('id, submissions_received')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycleError) throw cycleError;
      if (mountedRef.current) setCycle(cycleData);

      const { data: summariesData, error: summariesError } = await supabase
        .from('feedback_summaries')
        .select('*')
        .eq('user_id', profile.id)
        .order('generated_at', { ascending: false });

      if (summariesError) throw summariesError;
      if (mountedRef.current) setSummaries(summariesData || []);

      const latest = summariesData && summariesData.length > 0 ? summariesData[0] : null;

      // Load recs tied to latest summary, if it exists
      if (!latest?.id) {
        if (mountedRef.current) setRecommendations([]);
      } else {
        const { data: recommendationsData, error: recommendationsError } = await supabase
          .from('growth_recommendations')
          .select('*')
          .eq('summary_id', latest.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (recommendationsError) throw recommendationsError;
        if (mountedRef.current) setRecommendations(recommendationsData || []);
      }

      // Remaining traits: derived from all_trait_scores, excluding strengths and growth opportunities
      if (latest) {
        const rawAll = Array.isArray((latest as any).all_trait_scores)
          ? (latest as any).all_trait_scores
          : [];

        const strengthTraits = new Set(
          Array.isArray(latest.top_strengths) ? latest.top_strengths.map((s: any) => s.trait) : []
        );
        const growthTraits = new Set(
          Array.isArray(latest.growth_opportunities)
            ? latest.growth_opportunities.map((g: any) => g.trait)
            : []
        );

        const remaining: TraitScore[] = rawAll
          .map((t: any) => ({ trait: String(t.trait), score: Number(t.score || 0) }))
          .filter((t: TraitScore) => t.trait && !strengthTraits.has(t.trait) && !growthTraits.has(t.trait))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

        if (mountedRef.current) setRemainingTraits(remaining);
      } else {
        if (mountedRef.current) setRemainingTraits([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleRecommendation = useCallback(async (id: string, currentStatus: boolean) => {
    const nextValue = !currentStatus;

    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_completed: nextValue } : r))
    );

    try {
      const { error } = await supabase
        .from('growth_recommendations')
        .update({ is_completed: nextValue })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating recommendation:', error);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_completed: currentStatus } : r))
      );
    }
  }, []);

  const sortedRecommendations = useMemo(() => {
    const active = recommendations.filter((r) => !r.is_completed);
    const done = recommendations.filter((r) => r.is_completed);
    return [...active, ...done];
  }, [recommendations]);

  const strengthsCount = Array.isArray(latestSummary?.top_strengths) ? latestSummary!.top_strengths.length : 0;
  const growthCount = Array.isArray(latestSummary?.growth_opportunities) ? latestSummary!.growth_opportunities.length : 0;
  const completedCount = recommendations.filter((r) => r.is_completed).length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingBottom: bottomPad }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!latestSummary) {
    return (
      <View style={[styles.emptyContainer, { paddingBottom: bottomPad }]}>
        <TrendingUp size={48} color="#9CA3AF" strokeWidth={2} />
        <Text style={styles.emptyTitle}>No Insights Yet</Text>
        <Text style={styles.emptyText}>
          You'll receive your first feedback summary after 10 people have responded. Keep sending
          requests!
        </Text>
      </View>
    );
  }

  const showThemesSection = Boolean(latestSummary.patterns) || remainingTraits.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Growth Journey</Text>
        <Text style={styles.subtitle}>
          Insights from {cycle?.submissions_received || latestSummary.submission_count} trusted
          people who care about you
        </Text>

        {/* Snapshot pills */}
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotPill}>
            <Text style={styles.snapshotBig}>{strengthsCount}</Text>
            <Text style={styles.snapshotSmall}>Strengths</Text>
          </View>

          <View style={styles.snapshotPill}>
            <Text style={styles.snapshotBig}>{growthCount}</Text>
            <Text style={styles.snapshotSmall}>Focus areas</Text>
          </View>

          <View style={styles.snapshotPill}>
            <Text style={styles.snapshotBig}>
              {recommendations.length === 0 ? '0' : `${completedCount}/${recommendations.length}`}
            </Text>
            <Text style={styles.snapshotSmall}>Done</Text>
          </View>
        </View>
      </View>

      {/* Strengths */}
      <View style={styles.strengthsCard}>
        <View style={styles.cardHeader}>
          <Award size={24} color="#10B981" strokeWidth={2} />
          <Text style={styles.cardTitle}>Your Strengths</Text>
        </View>
        <Text style={styles.cardDescription}>
          These are the qualities that stand out most in how others experience you.
        </Text>

        {Array.isArray(latestSummary.top_strengths) && latestSummary.top_strengths.length > 0 ? (
          latestSummary.top_strengths.map((strength: any, index: number) => {
            const score = Number(strength.score || traitScoreMap.get(strength.trait) || 0);
            const percentile = traitPercentileMap.get(strength.trait) ?? 0.5;

            return (
              <View key={index} style={styles.strengthItem}>
                <View style={styles.strengthBadge}>
                  <Sparkles size={20} color="#10B981" strokeWidth={2} />
                </View>

                <View style={styles.strengthContent}>
                  <Text style={styles.strengthName}>{strength.trait}</Text>
                  <Text style={styles.strengthScore}>Average: {score.toFixed(1)}/5.0</Text>
                  <Text style={styles.strengthInsight}>
                    {getStrengthNarrative(score, percentile)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.cardEmptyText}>No strength highlights yet. More feedback will reveal clearer standouts.</Text>
        )}
      </View>

      {/* Growth Opportunities */}
      <View style={styles.opportunitiesCard}>
        <View style={styles.cardHeader}>
          <Target size={24} color="#3B82F6" strokeWidth={2} />
          <Text style={styles.cardTitle}>Growth Opportunities</Text>
        </View>
        <Text style={styles.cardDescription}>
          Areas where a little extra attention could improve how others experience you.
        </Text>

        {Array.isArray(latestSummary.growth_opportunities) && latestSummary.growth_opportunities.length > 0 ? (
          latestSummary.growth_opportunities.map((opportunity: any, index: number) => {
            const score = traitScoreMap.get(opportunity.trait);
            const percentile = traitPercentileMap.get(opportunity.trait) ?? 0.5;

            const label =
              score === undefined
                ? 'Focus'
                : score <= 3.2
                  ? 'High leverage'
                  : score <= 3.8
                    ? 'Good focus'
                    : 'Fine-tuning';

            const narrative = opportunity.note
              ? String(opportunity.note)
              : getGrowthNarrative(score ?? 0, percentile);

            return (
              <View key={index} style={styles.opportunityItem}>
                <View style={styles.opportunityIcon}>
                  <TrendingUp size={20} color="#3B82F6" strokeWidth={2} />
                </View>

                <View style={styles.opportunityContent}>
                  <Text style={styles.opportunityName}>{opportunity.trait}</Text>

                  <View style={styles.opportunityMetaRow}>
                    <Text style={styles.opportunityTag}>{label}</Text>
                    {score !== undefined && (
                      <Text style={styles.opportunityScore}>{score.toFixed(1)}/5</Text>
                    )}
                  </View>

                  <Text style={styles.opportunityNote}>{narrative}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.cardEmptyText}>No growth focus areas yet. More feedback will reveal clearer patterns.</Text>
        )}
      </View>

      {/* Consistent Themes + Other Traits */}
      {showThemesSection && (
        <View style={styles.patternsCard}>
          <Text style={styles.patternsTitle}>Consistent Themes</Text>

          {themeBullets.length > 0 ? (
            <>
              <Text style={styles.themeIntro}>{getThemeIntro(themeBullets.length)}</Text>
              <View style={styles.themeList}>
                {themeBullets.map((t, idx) => (
                  <View key={idx} style={styles.themeRow}>
                    <View style={styles.themeDot} />
                    <Text style={styles.themeText}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.themeFallback}>
              No themes detected yet. More feedback will reveal clearer patterns.
            </Text>
          )}

          <View style={styles.importantNoteCard}>
            <Text style={styles.importantNoteText}>
              This feedback reflects how others experience you. It is insight, not a verdict on your worth.
            </Text>
          </View>

          {remainingTraits.length > 0 && (
            <View style={styles.remainingTraitsSection}>
              <Text style={styles.remainingTraitsTitle}>Other Traits</Text>
              <Text style={styles.remainingTraitsHint}>
                These traits are steady. Not your top strengths or biggest growth areas, but they still shape your day-to-day impact.
              </Text>

              {remainingTraits.map((item, index) => (
                <View key={index} style={styles.remainingTraitRow}>
                  <View style={styles.remainingTraitTopRow}>
                    <Text style={styles.remainingTraitName}>{item.trait}</Text>
                    <Text style={styles.remainingTraitScore}>{item.score.toFixed(1)}/5</Text>
                  </View>

                  <View style={styles.remainingBarTrack}>
                    <View
                      style={[
                        styles.remainingBarFill,
                        { width: `${Math.min(100, (item.score / 5) * 100)}%` },
                      ]}
                    />
                  </View>

                  <Text style={styles.remainingTraitHintText}>
                    {getBalancedTraitNarrative(item.score)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Progress */}
      {latestSummary.comparison_to_previous && (
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Your Progress</Text>
          <Text style={styles.comparisonText}>{latestSummary.comparison_to_previous}</Text>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>Growth Recommendations</Text>
        <Text style={styles.sectionDescription}>Small, actionable steps to help you grow</Text>

        {sortedRecommendations.length === 0 ? (
          <View style={styles.recommendationsEmpty}>
            <Text style={styles.recommendationsEmptyTitle}>No recommendations yet</Text>
            <Text style={styles.recommendationsEmptyText}>
              Once your summary generates actions, they will appear here. Keep collecting feedback.
            </Text>
          </View>
        ) : (
          sortedRecommendations.map((rec) => (
            <TouchableOpacity
              key={rec.id}
              style={styles.recommendationCard}
              onPress={() => toggleRecommendation(rec.id, rec.is_completed)}
              activeOpacity={0.85}
            >
              <View style={styles.recommendationHeader}>
                {rec.is_completed ? (
                  <CheckCircle size={24} color="#10B981" strokeWidth={2} />
                ) : (
                  <Circle size={24} color="#9CA3AF" strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.recommendationTitle,
                    rec.is_completed && styles.recommendationTitleCompleted,
                  ]}
                >
                  {rec.title}
                </Text>
              </View>

              <Text
                style={[
                  styles.recommendationDescription,
                  rec.is_completed && styles.recommendationDescriptionCompleted,
                ]}
              >
                {rec.description}
              </Text>

              <View style={styles.recommendationBadge}>
                <Text style={styles.recommendationBadgeText}>
                  {rec.recommendation_type === 'strength'
                    ? 'Strength'
                    : rec.recommendation_type === 'growth'
                      ? 'Growth'
                      : 'Habit'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.encouragementCard}>
        <Sparkles size={24} color="#F59E0B" strokeWidth={2} />
        <Text style={styles.encouragementTitle}>Remember</Text>
        <Text style={styles.encouragementText}>
          Growth is a journey. Small steps count. Be patient and kind with yourself as you continue to grow.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  loadingText: { fontSize: 16, color: '#6B7280' },

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
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },

  header: { marginBottom: 18, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },

  snapshotRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  snapshotPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  snapshotBig: { fontSize: 18, fontWeight: '800', color: '#111827' },
  snapshotSmall: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#6B7280' },

  strengthsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  opportunitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  cardEmptyText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  strengthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  strengthBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  strengthContent: { flex: 1 },
  strengthName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  strengthScore: { fontSize: 14, color: '#059669', fontWeight: '600' },
  strengthInsight: { fontSize: 13, color: '#374151', lineHeight: 18, marginTop: 6 },

  opportunityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  opportunityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  opportunityContent: { flex: 1 },
  opportunityName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  opportunityMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  opportunityTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  opportunityScore: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  opportunityNote: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  patternsCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 20, marginBottom: 16 },
  patternsTitle: { fontSize: 18, fontWeight: '700', color: '#92400E', marginBottom: 10 },
  themeIntro: { fontSize: 13, color: '#92400E', fontWeight: '700', marginBottom: 10 },
  themeList: { marginBottom: 14 },
  themeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  themeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#92400E', marginTop: 6 },
  themeText: { flex: 1, fontSize: 14, color: '#78350F', lineHeight: 20 },
  themeFallback: { fontSize: 14, color: '#78350F', lineHeight: 20, marginBottom: 12 },

  importantNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  importantNoteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 18,
    textAlign: 'center',
  },

  remainingTraitsSection: { marginTop: 6 },
  remainingTraitsTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  remainingTraitsHint: { fontSize: 13, color: '#92400E', lineHeight: 18, marginBottom: 10 },

  remainingTraitRow: { marginBottom: 14 },
  remainingTraitTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remainingTraitName: { fontSize: 14, fontWeight: '700', color: '#78350F' },
  remainingTraitScore: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  remainingBarTrack: { height: 8, backgroundColor: '#FDE68A', borderRadius: 999, marginTop: 6, overflow: 'hidden' },
  remainingBarFill: { height: 8, backgroundColor: '#F59E0B', borderRadius: 999 },
  remainingTraitHintText: { fontSize: 12, color: '#92400E', marginTop: 6, lineHeight: 16 },

  comparisonCard: { backgroundColor: '#E0E7FF', borderRadius: 16, padding: 20, marginBottom: 16 },
  comparisonTitle: { fontSize: 18, fontWeight: '700', color: '#3730A3', marginBottom: 8 },
  comparisonText: { fontSize: 15, color: '#4338CA', lineHeight: 22 },

  recommendationsSection: { marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },

  recommendationsEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recommendationsEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  recommendationsEmptyText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  recommendationCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  recommendationTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  recommendationTitleCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  recommendationDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  recommendationDescriptionCompleted: { color: '#9CA3AF' },

  recommendationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendationBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  encouragementCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 20, alignItems: 'center' },
  encouragementTitle: { fontSize: 18, fontWeight: '700', color: '#92400E', marginTop: 12, marginBottom: 8 },
  encouragementText: { fontSize: 14, color: '#78350F', textAlign: 'center', lineHeight: 20 },
});
