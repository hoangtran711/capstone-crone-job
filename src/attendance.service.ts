import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';

import {
  StudentSchedules,
  StudentSchedulesDocument,
} from '@schemas/student-schedule.schema';
import { CronJob } from 'cron';
import * as moment from 'moment';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas';

@Injectable()
export class AttendaceService {
  constructor(
    @InjectModel(StudentSchedules.name)
    private studentSchedules: Model<StudentSchedulesDocument>,
    @InjectModel(User.name)
    private usersModal: Model<UserDocument>,
    private mailService: MailerService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  @Cron('20 * * * * *')
  async handleCron() {
    const studentSchedules = await this.studentSchedules.find();
    for (const studentSchedule of studentSchedules) {
      const schedules = studentSchedule.schedules;
      for (const schedule of schedules) {
        for (const time of schedule.times) {
          const index = schedule.times.indexOf(time);
          const cronJobName = `${studentSchedule.studentId}-${schedule.projectId}-${index}`;
          const user = await this.usersModal.findById(
            studentSchedule.studentId,
          );
          if (
            moment().isAfter(moment(time.date, 'dddd, MMMM Do YYYY, h:m:s'))
          ) {
            continue;
          }

          try {
            this.schedulerRegistry.getCronJob(cronJobName);
          } catch {
            const job = new CronJob(
              moment(time.date, 'dddd, MMMM Do YYYY, h:m:s').toDate(),
              async () => {
                console.log('run email send');
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
              },
            );
            this.schedulerRegistry.addCronJob(cronJobName, job);
            job.start();
          }
        }
      }

      //   if(foundStudent) {
      //       const
      //   }
    }
  }
  private;
}
