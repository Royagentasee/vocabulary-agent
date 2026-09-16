import { Body, Controller, Post } from '@nestjs/common'
import { Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState } from '@vocab-agent/types'
import { ReviewService } from './review.service'

interface ReviewRequest {
  card: FSRSCardState
  rating: Rating
}

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  review(@Body() body: ReviewRequest) {
    return this.reviewService.review(body.card, body.rating)
  }

  @Post('new')
  newCard() {
    return this.reviewService.newCard()
  }
}
