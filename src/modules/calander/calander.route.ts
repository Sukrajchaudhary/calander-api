import { Router } from 'express';
import CalanderController from './calander.controller';
import {
      validateCreateEvent,
      validateUpdateEvent,
      validateEventId,
      validateGetEvents,
} from './calander.validator';

const router: Router = Router();

router.get(
      '/',
      validateGetEvents,
      CalanderController.getAllEvents
);

router.get(
      '/:id',
      validateEventId,
      CalanderController.getEventById
);

router.post(
      '/',
      validateCreateEvent,
      CalanderController.createEvent
);

router.put(
      '/:id',
      validateUpdateEvent,
      CalanderController.updateEvent
);

router.delete(
      '/:id',
      validateEventId,
      CalanderController.deleteEvent
);

export default router;
