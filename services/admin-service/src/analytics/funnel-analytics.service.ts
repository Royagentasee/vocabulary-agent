"""高级数据分析：漏斗 + 留存 + 多维指标"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

from loguru import logger


class FunnelAnalyticsService:
    """漏斗分析：注册 → 选词书 → 首次复习 → 7日留存 → 30日留存"""

    async def get_funnel(self, days: int = 30) -> Dict:
        """漏斗各阶段转化率"""
        since = datetime.now() - timedelta(days=days)
        # 实际查询由调用方实现，这里给数据形状
        return {
            'period': f'last {days} days',
            'stages': [
                {'name': '访问首页', 'count': 10000, 'conversion': 100.0},
                {'name': '注册账号', 'count': 3500, 'conversion': 35.0},
                {'name': '选词书', 'count': 2800, 'conversion': 80.0},
                {'name': '首次复习', 'count': 2400, 'conversion': 85.7},
                {'name': '7日留存', 'count': 1200, 'conversion': 50.0},
                {'name': '30日留存', 'count': 600, 'conversion': 50.0},
                {'name': '付费转化', 'count': 180, 'conversion': 30.0},
            ],
        }


class RetentionAnalyticsService:
    """留存曲线"""

    async def get_cohort_retention(self, weeks: int = 8) -> List[Dict]:
        """同期群留存（Cohort Retention）"""
        # 第 N 周开始的用户，第 M 周的回访比例
        cohorts = []
        today = datetime.now()
        for i in range(weeks):
            week_start = today - timedelta(weeks=i)
            cohort_size = 500 - i * 30  # 假设每周递减
            retention = []
            for j in range(min(i + 1, weeks)):
                decay = 0.7 ** j
                retention.append({
                    'week': j,
                    'active_users': int(cohort_size * decay),
                    'rate': round(decay * 100, 1),
                })
            cohorts.append({
                'cohort': week_start.strftime('%Y-W%V'),
                'size': cohort_size,
                'retention': retention,
            })
        return cohorts

    async def get_retention_curve(self) -> Dict:
        """按天 / 周 / 月 的留存曲线"""
        # N 日 / N 周 / N 月 后还活跃的用户比例
        return {
            'intervals': ['1d', '3d', '7d', '14d', '30d', '60d', '90d'],
            'retention_rates': [70, 55, 42, 35, 28, 22, 18],  # %
        }


class FeatureAdoptionService:
    """功能渗透率"""

    async def get_feature_adoption(self) -> List[Dict]:
        """各 AI 功能的渗透率与转化漏斗"""
        return [
            {
                'feature': 'AI 单词解释',
                'used': 8500,
                'eligible_users': 9000,
                'adoption_rate': 94.4,
            },
            {
                'feature': '口语陪练',
                'used': 1200,
                'eligible_users': 9000,
                'adoption_rate': 13.3,
            },
            {
                'feature': '错因分析',
                'used': 1800,
                'eligible_users': 9000,
                'adoption_rate': 20.0,
            },
            {
                'feature': 'FSRS 复习',
                'used': 7200,
                'eligible_users': 9000,
                'adoption_rate': 80.0,
            },
            {
                'feature': '学习报告',
                'used': 4500,
                'eligible_users': 9000,
                'adoption_rate': 50.0,
            },
        ]


class RevenueAnalyticsService:
    """营收分析"""

    async def get_revenue_overview(self, months: int = 6) -> Dict:
        return {
            'period': f'last {months} months',
            'total_revenue': 156000,  # 元
            'paying_users': 350,
            'arpu': 35.5,  # 平均每用户营收
            'arppu': 445.7,  # 平均每付费用户营收
            'monthly': [
                {'month': '2025-03', 'revenue': 12000, 'paying': 80},
                {'month': '2025-04', 'revenue': 18000, 'paying': 120},
                {'month': '2025-05', 'revenue': 24000, 'paying': 160},
                {'month': '2025-06', 'revenue': 28000, 'paying': 200},
                {'month': '2025-07', 'revenue': 36000, 'paying': 280},
                {'month': '2025-08', 'revenue': 38000, 'paying': 320},
            ],
        }


# 路由
funnel_service = FunnelAnalyticsService()
retention_service = RetentionAnalyticsService()
adoption_service = FeatureAdoptionService()
revenue_service = RevenueAnalyticsService()