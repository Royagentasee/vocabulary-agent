"""高级分析路由：漏斗 / 留存 / 营收"""
from fastapi import FastAPI, Query
from fastapi import APIRouter
from app.services.analytics.advanced import (
    funnel_service,
    retention_service,
    adoption_service,
    revenue_service,
)

router = APIRouter(prefix='/analytics', tags=['analytics-advanced'])


@router.get('/funnel')
async def get_funnel(days: int = 30):
    """用户转化漏斗"""
    return await funnel_service.get_funnel(days)


@router.get('/retention/cohort')
async def get_cohort_retention(weeks: int = 8):
    """同期群留存"""
    return await retention_service.get_cohort_retention(weeks)


@router.get('/retention/curve')
async def get_retention_curve():
    """N 日 / 周 / 月 留存曲线"""
    return await retention_service.get_retention_curve()


@router.get('/adoption')
async def get_feature_adoption():
    """各功能渗透率"""
    return await adoption_service.get_feature_adoption()


@router.get('/revenue')
async def get_revenue(months: int = 6):
    """营收分析"""
    return await revenue_service.get_revenue_overview(months)