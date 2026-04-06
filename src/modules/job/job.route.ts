import { Router } from "express";
import { JobController } from "./job.controller";
import { JobService } from "./job.service";
import { JobRepository } from "./job.repository";

const router = Router();

const jobRepository = new JobRepository();
const jobService = new JobService(jobRepository);
const jobController = new JobController(jobService);

router.get("/:jobId", jobController.getJob);

export default router;
