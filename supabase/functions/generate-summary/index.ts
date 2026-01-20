import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  cycle_id: string;
  user_id: string;
  submission_count: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cycle_id, user_id, submission_count }: RequestBody = await req.json();

    const { data: submissions, error: submissionsError } = await supabase
      .from("feedback_submissions")
      .select(`
        rating,
        reflection,
        trait_id,
        traits (
          name
        )
      `)
      .eq("cycle_id", cycle_id);

    if (submissionsError) throw submissionsError;

    const traitAverages = submissions.reduce((acc: any, sub: any) => {
      const traitName = sub.traits.name;
      if (!acc[traitName]) {
        acc[traitName] = { total: 0, count: 0, ratings: [] };
      }
      acc[traitName].total += sub.rating;
      acc[traitName].count += 1;
      acc[traitName].ratings.push(sub.rating);
      return acc;
    }, {});

    const traitScores = Object.entries(traitAverages).map(([trait, data]: [string, any]) => ({
      trait,
      score: data.total / data.count,
      count: data.count,
    }));

    traitScores.sort((a, b) => b.score - a.score);

    const topStrengths = traitScores.slice(0, 3).map(t => ({
      trait: t.trait,
      score: t.score,
    }));

    const growthOpportunities = traitScores.slice(-3).reverse().map(t => ({
      trait: t.trait,
      score: t.score,
      note: t.score < 3.5
        ? "This is an area where focused development could make a meaningful difference"
        : "While already good, there's room to grow even stronger here",
    }));

    let patterns = generatePatterns(traitScores, submission_count);

    const { data: previousSummary } = await supabase
      .from("feedback_summaries")
      .select("*")
      .eq("user_id", user_id)
      .eq("cycle_id", cycle_id)
      .lt("submission_count", submission_count)
      .order("submission_count", { ascending: false })
      .limit(1)
      .maybeSingle();

    let comparison = null;
    if (previousSummary) {
      comparison = generateComparison(
        previousSummary.top_strengths,
        topStrengths,
        previousSummary.growth_opportunities,
        growthOpportunities
      );
    }

    const { data: summary, error: summaryError } = await supabase
      .from("feedback_summaries")
      .insert({
        cycle_id,
        user_id,
        submission_count,
        top_strengths: topStrengths,
        growth_opportunities: growthOpportunities,
        all_trait_scores: traitScores.map(t => ({ trait: t.trait, score: t.score })),
        patterns,
        comparison_to_previous: comparison,
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    const recommendations = generateRecommendations(topStrengths, growthOpportunities, summary.id, user_id);

    const { error: recsError } = await supabase
      .from("growth_recommendations")
      .insert(recommendations);

    if (recsError) throw recsError;

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generatePatterns(traitScores: any[], submissionCount: number): string {
  const highScores = traitScores.filter(t => t.score >= 4.0);
  const lowScores = traitScores.filter(t => t.score < 3.5);

  let patterns = `Based on ${submissionCount} responses, people consistently recognize `;

  if (highScores.length > 0) {
    const traits = highScores.map(t => t.trait.toLowerCase()).join(", ");
    patterns += `your strength in ${traits}. `;
  }

  if (lowScores.length > 0) {
    const traits = lowScores.map(t => t.trait.toLowerCase()).join(" and ");
    patterns += `There are opportunities to develop your ${traits} further. `;
  }

  patterns += "Remember, this feedback reflects how others experience you—it's valuable insight, not a verdict on your worth.";

  return patterns;
}

function generateComparison(
  prevStrengths: any[],
  currStrengths: any[],
  prevOpportunities: any[],
  currOpportunities: any[]
): string {
  const prevTopTrait = prevStrengths[0]?.trait;
  const currTopTrait = currStrengths[0]?.trait;

  if (prevTopTrait === currTopTrait) {
    return `Your ${currTopTrait.toLowerCase()} continues to be your strongest quality. People consistently see this strength in you, which shows it's a stable part of who you are. Keep nurturing this gift.`;
  } else {
    return `Interesting shift: ${currTopTrait} has emerged as your top strength, while ${prevTopTrait.toLowerCase()} remains strong. This shows you're developing in multiple dimensions. Growth isn't linear—it's multifaceted, just like you.`;
  }
}

function generateRecommendations(
  strengths: any[],
  opportunities: any[],
  summaryId: string,
  userId: string
): any[] {
  const recommendations = [];

  if (strengths[0]) {
    recommendations.push({
      user_id: userId,
      summary_id: summaryId,
      recommendation_type: "strength",
      title: `Leverage your ${strengths[0].trait.toLowerCase()}`,
      description: `Your ${strengths[0].trait.toLowerCase()} is recognized by others. Consider mentoring someone in this area or taking on projects where this strength can shine even more.`,
    });
  }

  if (opportunities[0]) {
    recommendations.push({
      user_id: userId,
      summary_id: summaryId,
      recommendation_type: "growth",
      title: `Develop your ${opportunities[0].trait.toLowerCase()}`,
      description: `Try this: For the next week, pay extra attention to opportunities where you can practice ${opportunities[0].trait.toLowerCase()}. Small, consistent actions create lasting growth.`,
    });
  }

  if (opportunities[1]) {
    recommendations.push({
      user_id: userId,
      summary_id: summaryId,
      recommendation_type: "habit",
      title: `Daily practice: ${opportunities[1].trait}`,
      description: `Set a daily reminder to intentionally practice one aspect of ${opportunities[1].trait.toLowerCase()}. Growth happens in small moments, not giant leaps.`,
    });
  }

  recommendations.push({
    user_id: userId,
    summary_id: summaryId,
    recommendation_type: "habit",
    title: "Reflect on your journey",
    description: "Take 5 minutes each week to journal about one moment where you noticed yourself growing. Celebrating small wins builds momentum.",
  });

  return recommendations;
}
