import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Sparkles, Heart, Compass, ShieldCheck } from 'lucide-react-native';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bottomPad = tabBarHeight + Math.max(16, insets.bottom);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>About Growth</Text>
        <Text style={styles.subtitle}>
          A gentle space for self-awareness, reflection, and becoming.
        </Text>
      </View>

      {/* Card 1: Welcome */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeWarm]}>
            <Sparkles size={18} color="#92400E" strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>Welcome to Growth</Text>
        </View>

        <Text style={styles.cardText}>
          Taking this step is a brave and meaningful choice.{'\n\n'}
          Growth is a space for building self-awareness with kindness. It helps you
          recognize the strengths you already have, understand how others experience
          you, and grow in ways that feel empowering and aligned with who you are.
        </Text>
      </View>

      {/* Card 2: Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeSoft]}>
            <ShieldCheck size={18} color="#065F46" strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>A gentle reminder</Text>
        </View>

        <Text style={styles.cardText}>
          The feedback you receive here is not a judgment and not a measure of your worth.{'\n\n'}
          It simply reflects how a small group of people sees you, shaped by their own
          perspectives and experiences.{'\n\n'}
          <Text style={styles.emphasis}>
            You are already valuable. You are already worthy. You are already enough.
          </Text>
        </Text>
      </View>

      {/* Card 3: How it works */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgeBlue]}>
            <Compass size={18} color="#1D4ED8" strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>How Growth works</Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Invite people you trust</Text>
          <Text style={styles.stepText}>
            Choose people who know you well and care about your growth.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Receive thoughtful insights</Text>
          <Text style={styles.stepText}>
            Once responses are received, Growth highlights patterns, strengths, and opportunities.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Reflect, don’t rush</Text>
          <Text style={styles.stepText}>
            There’s no urgency here. Reflection is part of the process.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Take small, meaningful steps</Text>
          <Text style={styles.stepText}>
            When you’re ready, gentle recommendations support you at your own pace.
          </Text>
        </View>
      </View>

      {/* Card 4: Closing */}
      <View style={[styles.card, styles.cardWarm]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, styles.iconBadgePink]}>
            <Heart size={18} color="#9F1239" strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>You’re not “behind”</Text>
        </View>

        <Text style={styles.cardText}>
          This is not about fixing yourself or becoming someone else.{'\n\n'}
          It’s about understanding yourself more deeply and choosing how you want to grow.{'\n\n'}
          Growth is here to support you, every step of the way.
        </Text>
      </View>

      {/* Footer note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tip: Take what resonates, leave what doesn’t, and go at your own pace.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },

  header: { paddingTop: 16, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardWarm: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconBadgeWarm: { backgroundColor: '#FEF3C7' },
  iconBadgeSoft: { backgroundColor: '#D1FAE5' },
  iconBadgeBlue: { backgroundColor: '#DBEAFE' },
  iconBadgePink: { backgroundColor: '#FFE4E6' },

  cardText: { fontSize: 14, color: '#374151', lineHeight: 21 },
  emphasis: { fontWeight: '800', color: '#111827' },

  step: { marginTop: 10 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 3 },
  stepText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  footer: { marginTop: 6, paddingHorizontal: 8, paddingBottom: 8 },
  footerText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
});
