import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
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
}

interface FeedbackCycle {
  id: string;
  submissions_received: number;
}

interface GrowthRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  is_completed: boolean;
}

interface Trait {
  id: string;
  name: string;
  display_order: number;
}

interface TraitScore {
  trait: string;
  score: number;
}

export default function GrowthScreen() {
  const { profile } = useAuth();
  const [summaries, setSummaries] = useState<FeedbackSummary[]>([]);
  const [cycle, setCycle] = useState<FeedbackCycle | null>(null);
  const [recommendations, setRecommendations] = useState<GrowthRecommendation[]>([]);
  const [remainingTraits, setRemainingTraits] = useState<TraitScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
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
      setCycle(cycleData);

      const { data: summariesData, error: summariesError } = await supabase
        .from('feedback_summaries')
        .select('*')
        .eq('user_id', profile.id)
        .order('generated_at', { ascending: false });

      if (summariesError) throw summariesError;
      setSummaries(summariesData || []);

      const { data: recommendationsData, error: recommendationsError } =
        await supabase
          .from('growth_recommendations')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

      if (recommendationsError) throw recommendationsError;
      setRecommendations(recommendationsData || []);

      // Get all trait scores from the summary
      if (summariesData && summariesData.length > 0) {
        const latestSummary = summariesData[0];

        // Get all trait scores from the summary
        const allTraitScores = Array.isArray(latestSummary.all_trait_scores)
          ? latestSummary.all_trait_scores
          : [];

        // Get trait names that are already shown in strengths or growth
        const strengthTraits = new Set(
          Array.isArray(latestSummary.top_strengths)
            ? latestSummary.top_strengths.map((s: any) => s.trait)
            : []
        );
        const growthTraits = new Set(
          Array.isArray(latestSummary.growth_opportunities)
            ? latestSummary.growth_opportunities.map((g: any) => g.trait)
            : []
        );

        // Show all remaining traits that aren't in top 3 or bottom 3
        const remaining: TraitScore[] = allTraitScores
          .filter((scoreData: any) =>
            !strengthTraits.has(scoreData.trait) && !growthTraits.has(scoreData.trait)
          )
          .map((scoreData: any) => ({
            trait: scoreData.trait,
            score: scoreData.score || 0,
          }));

        setRemainingTraits(remaining);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleRecommendation = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('growth_recommendations')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (summaries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <TrendingUp size={48} color="#9CA3AF" strokeWidth={2} />
        <Text style={styles.emptyTitle}>No Insights Yet</Text>
        <Text style={styles.emptyText}>
          You'll receive your first feedback summary after 10 people have
          responded. Keep sending requests!
        </Text>
      </View>
    );
  }

  const latestSummary = summaries[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Growth Journey</Text>
        <Text style={styles.subtitle}>
          Insights from {cycle?.submissions_received || latestSummary.submission_count} trusted people who care
          about you
        </Text>
      </View>

      <View style={styles.strengthsCard}>
        <View style={styles.cardHeader}>
          <Award size={24} color="#10B981" strokeWidth={2} />
          <Text style={styles.cardTitle}>Your Strengths</Text>
        </View>
        <Text style={styles.cardDescription}>
          These are the qualities that shine brightest in you
        </Text>
        {Array.isArray(latestSummary.top_strengths) &&
          latestSummary.top_strengths.map((strength: any, index: number) => (
            <View key={index} style={styles.strengthItem}>
              <View style={styles.strengthBadge}>
                <Sparkles size={20} color="#10B981" strokeWidth={2} />
              </View>
              <View style={styles.strengthContent}>
                <Text style={styles.strengthName}>{strength.trait}</Text>
                <Text style={styles.strengthScore}>
                  Average: {strength.score.toFixed(1)}/5.0
                </Text>
              </View>
            </View>
          ))}
      </View>

      <View style={styles.opportunitiesCard}>
        <View style={styles.cardHeader}>
          <Target size={24} color="#3B82F6" strokeWidth={2} />
          <Text style={styles.cardTitle}>Growth Opportunities</Text>
        </View>
        <Text style={styles.cardDescription}>
          Areas where you can continue to develop and grow
        </Text>
        {Array.isArray(latestSummary.growth_opportunities) &&
          latestSummary.growth_opportunities.map(
            (opportunity: any, index: number) => (
              <View key={index} style={styles.opportunityItem}>
                <View style={styles.opportunityIcon}>
                  <TrendingUp size={20} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.opportunityContent}>
                  <Text style={styles.opportunityName}>{opportunity.trait}</Text>
                  <Text style={styles.opportunityNote}>
                    {opportunity.note || 'Focus area for development'}
                  </Text>
                </View>
              </View>
            )
          )}
      </View>

      {latestSummary.patterns && (
        <View style={styles.patternsCard}>
          <Text style={styles.patternsTitle}>Consistent Themes</Text>

          <View style={styles.importantNoteCard}>
            <Text style={styles.importantNoteText}>
              Remember, this feedback reflects how others experience you—it's valuable insight, not a verdict on your worth.
            </Text>
          </View>

          {remainingTraits.length > 0 && (
            <View style={styles.remainingTraitsSection}>
              <Text style={styles.remainingTraitsTitle}>Other Traits</Text>
              {remainingTraits.map((item, index) => (
                <View key={index} style={styles.remainingTraitRow}>
                  <Text style={styles.remainingTraitText}>
                    {item.trait}: <Text style={styles.remainingTraitScore}>{item.score.toFixed(1)}/5</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {latestSummary.comparison_to_previous && (
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Your Progress</Text>
          <Text style={styles.comparisonText}>
            {latestSummary.comparison_to_previous}
          </Text>
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Growth Recommendations</Text>
          <Text style={styles.sectionDescription}>
            Small, actionable steps to help you grow
          </Text>
          {recommendations.map((rec) => (
            <TouchableOpacity
              key={rec.id}
              style={styles.recommendationCard}
              onPress={() => toggleRecommendation(rec.id, rec.is_completed)}
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
          ))}
        </View>
      )}

      <View style={styles.encouragementCard}>
        <Sparkles size={24} color="#F59E0B" strokeWidth={2} />
        <Text style={styles.encouragementTitle}>Remember</Text>
        <Text style={styles.encouragementText}>
          Growth is a journey, not a destination. Every small step forward is
          progress. Be patient and kind with yourself as you continue to grow.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
  strengthsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  strengthContent: {
    flex: 1,
  },
  strengthName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  strengthScore: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  opportunitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
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
  },
  opportunityContent: {
    flex: 1,
  },
  opportunityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  opportunityNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  patternsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  patternsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  importantNoteCard: {
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  importantNoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78350F',
    lineHeight: 22,
    textAlign: 'center',
  },
  patternsText: {
    fontSize: 15,
    color: '#78350F',
    lineHeight: 22,
    marginBottom: 16,
  },
  remainingTraitsSection: {
    marginTop: 20,
  },
  remainingTraitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  remainingTraitRow: {
    marginBottom: 8,
  },
  remainingTraitText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  remainingTraitScore: {
    fontWeight: '700',
    color: '#92400E',
  },
  comparisonCard: {
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 15,
    color: '#4338CA',
    lineHeight: 22,
  },
  recommendationsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recommendationTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationDescriptionCompleted: {
    color: '#9CA3AF',
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  encouragementCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 12,
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
  },
});
