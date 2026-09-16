import { Injectable } from '@nestjs/common'
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState } from '@vocab-agent/types'

@Injectable()
export class ReviewService {
  private readonly scheduler = createFSRS()

  /**
   * 复习一张卡片，返回新状态与下次复习时间
   */
  review(prev: FSRSCardState, rating: Rating) {
    return this.scheduler.review(prev, rating)
  }

  /**
   * 创建一张新卡片
   */
  newCard() {
    return this.scheduler.newCard()
  }
}
