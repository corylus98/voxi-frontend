'use client'

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import './i18n';

// Type definitions
interface TopicDurationData {
  topic: string;
  avg_duration: number;
  count: number;
}

interface TopicCountData {
  topic: string;
  count: number;
}

interface SentimentData {
  topic: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  negative_ratio: number;
}

interface HourData {
  hour: number;
  hour_display: string;
  hour_range: string;
  call_count: number;
  percentage: number;
}

interface PeakHoursData {
  peak_hour: {
    hour_display: string;
    call_count: number;
    percentage: string;
  };
  statistics: {
    total_calls: number;
    date_range: string;
    total_active_hours: number;
    average_calls_per_hour: number;
  };
  all_peak_hours: HourData[];
}

interface GrowingTopicData {
  topic: string;
  current_frequency: number;
  current_count: number;
  historical_avg_frequency: number;
  growth_ratio: number | 'new';
  is_growing: boolean;
}

interface MonthlyTrendData {
  month: string;
  topic: string;
  frequency: number;
}

interface GrowingTopicsData {
  current_month: string;
  current_month_calls: number;
  historical_months: number;
  growing_topics: GrowingTopicData[];
  monthly_topic_trends: MonthlyTrendData[];
}

interface ApiResponse {
  result?: TopicDurationData[] | TopicCountData[] | SentimentData[];
  peak_hour?: PeakHoursData['peak_hour'];
  statistics?: PeakHoursData['statistics'];
  all_peak_hours?: HourData[];
  growing_topics?: GrowingTopicData[];
  monthly_topic_trends?: MonthlyTrendData[];
  current_month?: string;
  current_month_calls?: number;
  historical_months?: number;
  insight?: string;
}

interface TableColumn {
  key: string;
  title: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ChartDataWithGrowth extends GrowingTopicData {
  growth_ratio_numeric: number;
  growth_display: string;
}


export default function Home() {
  const { t, i18n} = useTranslation();
  const [query, setQuery] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionKey, setCurrentQuestionKey] = useState<string>('');
  const [showResponse, setShowResponse] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Language switcher (inline)
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  type PredefinedQuestion = 
  | 'duration'
  | 'common'
  | 'sentiment'
  | 'growing'
  | 'peakHours';

  // API endpoints mapping
  const apiEndpoints: Record<string, string> = {
    [t('questions.duration')]: 'topic_duration_insight_local',
    [t('questions.common')]: 'processed_topic_count_local',
    [t('questions.sentiment')]: 'processed_topic_sentiment_distribution_local',
    [t('questions.growing')]: 'growing_topics_local',
    [t('questions.peakHours')]: 'peak_call_hours_local'
  };
  
  // Predefined questions 
  const predefinedQuestions = [
    { key: 'duration', endpoint: 'topic_duration_insight_local' },
    { key: 'common', endpoint: 'processed_topic_count_local' },
    { key: 'sentiment', endpoint: 'processed_topic_sentiment_distribution_local' },
    { key: 'growing', endpoint: 'growing_topics_local' },
    { key: 'peakHours', endpoint: 'peak_call_hours_local' }
  ] as const;


  // Colors for charts
  const chartColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#EC4899', '#84CC16'];
  const sentimentColors = {
    positive: '#10B981',
    neutral: '#6B7280',
    negative: '#EF4444'
  };

  // Mock response data
  const mockResponse = {
    summary: "Based on your query, I've analyzed the customer service call data from your database.",
    data: [
      { metric: "Total Calls", value: "2,847", change: "+15% from last month" },
      { metric: "Average Duration", value: "8.3 minutes", change: "-2% from last month" },
      { metric: "Customer Satisfaction", value: "4.2/5.0", change: "+0.3 from last month" },
      { metric: "Resolution Rate", value: "87%", change: "+5% from last month" }
    ],
    insights: [
      "Peak call times are between 10 AM - 2 PM on weekdays",
      "Billing inquiries account for 32% of all calls",
      "Agent response time has improved by 18% this quarter",
      "Customer satisfaction is highest for technical support calls"
    ],
    recommendations: [
      "Consider adding more staff during peak hours",
      "Implement automated billing FAQ system",
      "Provide additional training for product support agents"
    ]
  };

  // API call function
  const fetchInsight = async (question: string, endpoint?: string) => {
    
    try {
      // If it's a predefined question, use the specific endpoint
      if (endpoint) {
        // With Tailscale
        const response = await fetch(`http://100.74.230.10:8080/${endpoint}`, {
        // On server
        // const response = await fetch(`http://192.168.22.144:8080/${endpoint}`, {  
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } else {
        // For custom questions, use the auto_route endpoint
        // With Tailscale
        const response = await fetch(`http://100.74.230.10:8080/auto_route`, {
        // On server
        // const response = await fetch(`http://192.168.22.144:8080/auto_route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: question
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  };

  const handleSubmit = async (question: string, questionKey?: string, endpoint?: string) => {
    if (question.trim()) {
      setCurrentQuestion(question);
      setCurrentQuestionKey(questionKey || '');
      setIsLoading(true);
      setShowResponse(true);
      setError('null');
      console.log('Sending questions: ', question);
      // alert(`Question sent: "${question}"`);

      try {
        const data = await fetchInsight(question, endpoint);
        setResponseData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setResponseData(null);
      } finally {
        setIsLoading(false);
      }

      setQuery('');
    }
  };

  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      // For manual input, no predefined endpoint or key
      handleSubmit(query);
    }
  };

  const handleChipClick = (questionKey: string, endpoint: string) => {
    const translatedQuestion = t(`questions.${questionKey}`);
    handleSubmit(translatedQuestion, questionKey, endpoint);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        handleSubmit(query);
      }
    }
  };

  const resetHome = () => {
    setShowResponse(false);
    setCurrentQuestion('');
    setCurrentQuestionKey('');
    setQuery('');
    setResponseData(null);
    setError('null');
  };

  // Simple language switcher
  const LanguageSwitcher = () => {
    const languages = [
      {code: 'en', name: 'English'},
      {code: 'zh_tra', name: '繁體中文'},
      {code: 'zh_sim', name: '简体中文'}
    ];

    return (
      <div className="fixed top-4 right-4 z-50">
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm shadow-sm hover:shadow-md transition-all"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    );
  };


  // Visualization Components
  const TopicDurationChart = ({ data }: { data: TopicDurationData[] }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.avgDuration')}</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="topic" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis label={{ value: t('labels.duration'), angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value, name) => [
                typeof value === 'number' ? `${value.toFixed(1)}s` : `${value}s`, 
                t('labels.avgDuration')
              ]}
              labelFormatter={(label) => `${t('labels.topic')}: ${label}`}
            />
            <Bar dataKey="avg_duration" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const TopicCountChart = ({ data }: { data: TopicCountData[] }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.callCount')}</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="topic" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis label={{ value: t('labels.callCount'), angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value, name) => [value, t('labels.callCount')]}
              labelFormatter={(label) => `${t('labels.topic')}: ${label}`}
            />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const SentimentDistributionChart = ({ data }: { data: SentimentData[] }) => {
    // Prepare data for pie chart (overall sentiment distribution)
    const overallSentiment = data.reduce((acc, item) => {
      acc.positive += item.positive;
      acc.neutral += item.neutral;
      acc.negative += item.negative;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    const pieData = [
      { name: t('labels.positive'), value: overallSentiment.positive, color: sentimentColors.positive },
      { name: t('labels.neutral'), value: overallSentiment.neutral, color: sentimentColors.neutral },
      { name: t('labels.negative'), value: overallSentiment.negative, color: sentimentColors.negative }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.sentiment')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Negative Ratio Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.negativeRatio')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="topic" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  label={{ value: t('labels.negativeRatio'), angle: -90, position: 'insideLeft' }}
                  domain={[0, 1]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip 
                  formatter={(value) => [
                    typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : `${value}%`, 
                    t('labels.negativeRatio')
                  ]}
                  labelFormatter={(label) => `${t('labels.topic')}: ${label}`}
                />
                <Bar dataKey="negative_ratio" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // ===== Peak Call Hours Visualization Component =====
  const PeakCallHoursChart = ({ data }: { data: PeakHoursData }) => {
    // Create complete 24-hour dataset with zeros for missing hours
    const completeHourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      const existingHour = data.all_peak_hours.find(h => h.hour === hour);
      if (existingHour) {
        completeHourlyData.push({
          ...existingHour,
          hour_label: existingHour.hour_display
        });
      } else {
        completeHourlyData.push({
          hour: hour,
          hour_display: `${hour.toString().padStart(2, '0')}:00`,
          hour_range: `${hour.toString().padStart(2, '0')}:00-${hour.toString().padStart(2, '0')}:59`,
          call_count: 0,
          percentage: 0,
          hour_label: `${hour.toString().padStart(2, '0')}:00`
        });
      }
    }

    // Get top 10 busiest hours
    const topPeakHours = data.all_peak_hours.slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.peakMoment')}</h3>
            <p className="text-2xl font-bold text-blue-600">{data.peak_hour?.hour_display}</p>
            {/* <p className="text-sm text-gray-600">{data.peak_hour?.call_count} calls ({data.peak_hour?.percentage}%)</p> */}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.totalCalls')}</h3>
            <p className="text-2xl font-bold text-gray-800">{data.statistics.total_calls.toLocaleString()}</p>
            <p className="text-sm text-gray-600">{data.statistics.date_range}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.activeHours')}</h3>
            <p className="text-2xl font-bold text-green-600">{data.statistics.total_active_hours}</p>
            {/* <p className="text-sm text-gray-600">out of 24 hours</p> */}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.avgPerHour')}</h3>
            <p className="text-2xl font-bold text-purple-600">{data.statistics.average_calls_per_hour}</p>
            {/* <p className="text-sm text-gray-600">calls per hour</p> */}
          </div>
        </div>

        {/* 24-Hour Timeline Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.callDistribution')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completeHourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour_label"
                  interval={1}
                />
                <YAxis label={{ value: t('labels.callCount'), angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [value, t('labels.callCount')]}
                  labelFormatter={(label) => `${t('labels.timeRange')}: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="call_count" 
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Peak Hours Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.peakHours')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPeakHours} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour_range" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis label={{ value: t('labels.callCount'), angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [value, t('labels.callCount')]}
                  labelFormatter={(label) => `${t('labels.timeRange')}: ${label}`}
                />
                <Bar dataKey="call_count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Percentage Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.callDistributionPercentage')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completeHourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour_label"
                  interval={1}
                />
                <YAxis 
                  label={{ value: t('labels.percentage'), angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, t('labels.percentage')]}
                  labelFormatter={(label) => `${t('labels.timeRange')}: ${label}`}
                />
                <Bar dataKey="percentage" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };


  // ===== Growing Topics Visualization Component =====
  const GrowingTopicsChart = ({ data }: { data: GrowingTopicsData }) => { 
    // Prepare data for growth ratio chart
    const growthData = data.growing_topics.map(topic => ({
      ...topic,
      growth_ratio_numeric: topic.growth_ratio === 'new' ? 10 : topic.growth_ratio,
      growth_display: topic.growth_ratio === 'new' ? t('labels.newTopic') : `${topic.growth_ratio}x`
    }));

    // Prepare monthly trend data for line chart
    const monthlyTrendData: Record<string, any> = {};
    data.monthly_topic_trends.forEach(item => {
      if (!monthlyTrendData[item.month]) { 
        monthlyTrendData[item.month] = { month: item.month };
      }
      monthlyTrendData[item.month][item.topic] = item.frequency;
    });

    const trendChartData = Object.values(monthlyTrendData).sort((a, b) => a.month.localeCompare(b.month));

    // Get unique topics for the line chart (top 5 growing topics)
    const topTopics = data.growing_topics.slice(0, 5).map(t => t.topic);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* <h3 className="text-sm font-medium text-gray-500 mb-2">Current Month</h3> */}
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.currentMonth')}</h3>
            <p className="text-2xl font-bold text-gray-800">{data.current_month}</p>
            {/* <p className="text-sm text-gray-600">{data.current_month_calls} calls</p> */}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.historicalMonths')}</h3>
            <p className="text-2xl font-bold text-gray-800">{data.historical_months}</p>
            {/* <p className="text-sm text-gray-600">months analyzed</p> */}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('stats.growingTopics')}</h3>
            <p className="text-2xl font-bold text-green-600">{data.growing_topics.length}</p>
            {/* <p className="text-sm text-gray-600">topics trending up</p> */}
          </div>
        </div>

        {/* Growth Ratio Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.growthRate')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="topic" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  label={{ value: t('labels.growthRate'), angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax']}
                />
                <Tooltip 
                formatter={(value) => [
                  growthData.find(item => item.growth_ratio_numeric === value)?.growth_display || value,
                  t('labels.growthRate')
                ]}
                labelFormatter={(label) => `${t('labels.topic')}: ${label}`}
              />
                <Bar dataKey="growth_ratio_numeric" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trends Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('charts.monthlyTrends')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  label={{ value: t('labels.frequency'), angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : `${value}%`, 
                    name
                  ]}
                  labelFormatter={(label) => `${t('labels.month')}: ${label}`}
                />
                <Legend />
                {topTopics.map((topic, index) => (
                  <Line 
                    key={topic}
                    type="monotone" 
                    dataKey={topic} 
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const DataTable = ({ data, columns }: { data: any[], columns: TableColumn[] }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('ui.detailedData')}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVisualization = () => {
    if (!responseData) return null;
   
    const { result } = responseData;
    
    // Check if this is peak call hours data
    if (responseData.peak_hour) {
      const columns: TableColumn[] = [
        { key: 'hour_range', title: t('labels.timeRange') },
        { key: 'call_count', title: t('labels.callCount') },
        { key: 'percentage', title: t('labels.percentage'), render: (value: any) => `${value}%` }
      ];
      return (
        <div className="space-y-6">
          <PeakCallHoursChart data={responseData as PeakHoursData} />
          <DataTable data={responseData.all_peak_hours || []} columns={columns} />
        </div>
      );
    }
    
    // Check if this is growing topics data
    if (responseData && responseData.growing_topics && responseData.monthly_topic_trends) {
      const columns: TableColumn[] = [
        { key: 'topic', title: t('labels.topic') },
        { 
          key: 'current_frequency', 
          title: t('labels.currentFreq'), 
          render: (value: any) => typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : `${value}%`
        },
        { key: 'current_count', title: t('labels.currentCount') },
        { 
          key: 'historical_avg_frequency', 
          title: t('labels.historicalAvg'), 
          render: (value: any) => typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : `${value}%`
        },
        { 
          key: 'growth_ratio', 
          title: t('labels.growthRate'), 
          render: (value: any) => value === 'new' ? t('labels.newTopic') : `${value}x` 
        },
        { 
          key: 'is_growing', 
          title: t('labels.isGrowing'), 
          render: (value: any) => value ? '✅' : '❌' 
        }
      ];
      return (
        <div className="space-y-6">
          <GrowingTopicsChart data={responseData as GrowingTopicsData} />
          <DataTable data={responseData.growing_topics} columns={columns} />
        </div>
      );
    }

    // Determine visualization type based on data structure
    if (result && result.length > 0) {
      const firstItem = result[0];
      
      if ('avg_duration' in firstItem) {
        // Topic duration insight
        const columns: TableColumn[] = [
          { key: 'topic', title: t('labels.topic') },
          { 
            key: 'avg_duration', 
            title: t('labels.avgDuration'), 
            render: (value: any) => typeof value === 'number' ? value.toFixed(1) : value 
          },
          { key: 'count', title: t('labels.callCount') }
        ];
        return (
          <div className="space-y-6">
            <TopicDurationChart data={result as TopicDurationData[]} />
            <DataTable data={result} columns={columns} />
          </div>
        );
      } else if ('positive' in firstItem) {
        // Sentiment distribution
        const columns: TableColumn[] = [
          { key: 'topic', title: t('labels.topic') },
          { key: 'positive', title: t('labels.positive') },
          { key: 'neutral', title: t('labels.neutral') },
          { key: 'negative', title: t('labels.negative') },
          { key: 'total', title: t('labels.total') },
          { 
            key: 'negative_ratio', 
            title: t('labels.negativeRatio'), 
            render: (value: any) => typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : `${value}%`
          }
        ];
        return (
          <div className="space-y-6">
            <SentimentDistributionChart data={result as SentimentData[]} />
            <DataTable data={result} columns={columns} />
          </div>
        );
      } else if ('count' in firstItem) {
        // Topic count
        const columns: TableColumn[] = [
          { key: 'topic', title: t('labels.topic') },
          { key: 'count', title: t('labels.callCount') }
        ];
        return (
          <div className="space-y-6">
            <TopicCountChart data={result as TopicCountData[]} />
            <DataTable data={result} columns={columns} />
          </div>
        );
      }
    }
   
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('ui.rawData')}</h2>
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
          {JSON.stringify(responseData, null, 2)}
        </pre>
      </div>
    );
   };

  if (showResponse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center space-x-3">
            <button 
              onClick={resetHome}
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              <span className="text-white font-bold text-lg">V</span>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                  {currentQuestionKey ? t(`questions.${currentQuestionKey}`) : currentQuestion}
              </h1>
              <p className="text-sm text-gray-500">{t('ui.analyzingData')}</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 py-8 pb-24">
          <div className="max-w-6xl mx-auto space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-lg text-gray-600">{t('ui.analyzing')}</span>
              </div>
            ) : (
              <>
                {/* Summary */}
                {/* <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Summary</h2>
                  <p className="text-gray-600">
                    {responseData?.insight || `Analysis results for: "${currentQuestion}"`}
                  </p>
                </section> */}

                {renderVisualization()}
                
              </>
            )}
          </div>
        </main>

        {/* Fixed Bottom Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
          <div className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ui.whatCanHelp')}
              className="w-full px-6 py-3 pr-16 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-white hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-0 placeholder-gray-400"
              onKeyDown={handleKeyDown}
            />
              <button
                onClick={() => handleSubmit(query)}
                disabled={!query.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>

          {/* Predefined Questions */}
          <div className="flex flex-wrap gap-2 justify-center">
            {predefinedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleChipClick(question.key, question.endpoint)}
                className="bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2 text-xs text-gray-600 hover:text-blue-700 transition-all duration-200 hover:shadow-sm whitespace-nowrap font-medium"
              >
                {t(`questions.${question.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6">
      <LanguageSwitcher />

      {/* Logo */}
      <div className="flex items-center justify-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">V</span>
        </div>
        <span className="text-3xl font-bold text-gray-800">Voxi</span>
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2 text-center">
        {t('welcome.title')}
      </h1>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto text-center mb-8">
      {t('welcome.subtitle')}
      </p>

      {/* Search Input */}
      <div className="w-full max-w-3xl mx-auto mb-8 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ui.askVoxi')}
          className="w-full px-6 py-4 pr-16 text-lg bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 focus:outline-none focus:ring-0 placeholder-gray-400"
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => handleSubmit(query)}
          disabled={!query.trim()}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
        >
          <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Predefined Questions */}
      <div className="w-full max-w-4xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {t('ui.commonQuestions')}
        </h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {predefinedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleChipClick(question.key, question.endpoint)}
              className="bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-300 rounded-xl px-4 py-3 text-sm text-gray-700 hover:text-blue-700 transition-all duration-200 hover:shadow-md hover:scale-105 whitespace-nowrap font-medium"
            >
              {t(`questions.${question.key}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}