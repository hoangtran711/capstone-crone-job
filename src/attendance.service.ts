import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import {
  ProjectSchedule,
  ProjectScheduleDocument,
} from '@schemas/project-schedule.schema';
import { StudentJoin, StudentJoinDocument } from '@schemas/student-join.schema';
import { CronJob } from 'cron';
import * as moment from 'moment';

import { Model } from 'mongoose';
import { User, UserDocument } from './schemas';

@Injectable()
export class AttendaceService {
  constructor(
    @InjectModel(User.name)
    private usersModal: Model<UserDocument>,
    @InjectModel(StudentJoin.name)
    private studentJoinModel: Model<StudentJoinDocument>,
    @InjectModel(ProjectSchedule.name)
    private projectScheduleModel: Model<ProjectScheduleDocument>,
    private mailService: MailerService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    const projectSchedules = await this.projectScheduleModel.find();
    for (const project of projectSchedules) {
      const projectId = project.projectId;
      const student = await this.studentJoinModel.findOne({ projectId });
      if (!student) continue;
      const studentJoined = student.studentsJoined;

      for (const schedule of project.schedules) {
        for (const studentId of studentJoined) {
          const cronJobName = `${projectId}-${schedule.startTime}-${studentId}`;
          if (moment().isAfter(moment(new Date(schedule.startTime)))) {
            continue;
          }
          try {
            this.schedulerRegistry.getCronJob(cronJobName);
          } catch {
            const job = new CronJob(
              moment(new Date(schedule.startTime))
                .subtract(1, 'minutes')
                .toDate(),
              async () => await this.sendMailAttendance(studentId),
            );
            this.schedulerRegistry.addCronJob(cronJobName, job);
            job.start();
          }
        }
      }
    }
  }

  private async sendMailAttendance(userId: string) {
    console.log('run email send');
    const user = await this.usersModal.findById(userId);
    await this.mailService.sendMail({
      to: user.email,
      from: 'tranhoang.finizz@gmail.com',
      subject: 'Attendance project now',
      template: 'email',
      context: {
        title: 'Remind Attendance',
        fullName: `${user.firstName} ${user.lastName}`,
        content1:
          'Your project has started attendance, Attendance should be checked in class.',
        content2: '',
        content3: '',
        content4: '',
        content5: '',
        linkUrl: `http://localhost:3000/sign-in`,
        titleButton: 'Go to Web',
      },
    });
  }
}
