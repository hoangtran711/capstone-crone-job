import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import {
  StudentDisabled,
  StudentDisabledDocument,
} from '@schemas/student-disabled.schema';

import {
  StudentSchedules,
  StudentSchedulesDocument,
} from '@schemas/student-schedule.schema';
import { CronJob } from 'cron';
import * as moment from 'moment';
import { Model } from 'mongoose';
import { Project, ProjectDocument, User, UserDocument } from './schemas';

@Injectable()
export class WarningService {
  constructor(
    @InjectModel(StudentSchedules.name)
    private studentSchedules: Model<StudentSchedulesDocument>,
    @InjectModel(StudentDisabled.name)
    private studentDisabledModel: Model<StudentDisabledDocument>,
    @InjectModel(User.name)
    private usersModal: Model<UserDocument>,
    @InjectModel(Project.name)
    private projectModal: Model<ProjectDocument>,
    private mailService: MailerService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  @Cron('20 * * * * *')
  async handleCron() {
    const studentSchedules = await this.studentSchedules.find();
    for (const studentSchedule of studentSchedules) {
      const schedules = studentSchedule.schedules;
      for (const schedule of schedules) {
        let totalLeaveDate = 0;
        for (const time of schedule.times) {
          if (
            moment().isBefore(moment(time.date, 'dddd, MMMM Do YYYY, h:m:s'))
          ) {
            totalLeaveDate++;
          }

          //
        }
        if (totalLeaveDate >= 3) {
          console.log('leave student from project');
          const foundDisabled = await this.studentDisabledModel.findOne({
            projectId: schedule.projectId,
          });
          if (foundDisabled) {
            const studentIds = [...foundDisabled.studentsDisabled];
            if (!studentIds.includes(studentSchedule.studentId)) {
              studentIds.push(studentSchedule.studentId);
              foundDisabled.studentsDisabled = studentIds;
              await foundDisabled.save();
            }
          } else {
            const studentId = studentSchedule.studentId;
            const newDisabled = new this.studentDisabledModel({
              projectId: schedule.projectId,
              studentsDisabled: [studentId],
            });
            await newDisabled.save();
          }
        } else if (totalLeaveDate >= 2) {
          const studentId = studentSchedule.studentId;
          const projectId = schedule.projectId;
          const cronJobName = `${studentSchedule.studentId}-${schedule.projectId}-${totalLeaveDate}-warning`;
          const user = await this.usersModal.findById(studentId);
          const project = await this.projectModal.findById(projectId);
          try {
            this.schedulerRegistry.getCronJob(cronJobName);
          } catch {
            const job = new CronJob(
              moment().add(10, 'seconds').toDate(),
              async () => {
                console.log('run email send: ' + user.email);
                await this.mailService.sendMail({
                  to: user.email,
                  from: 'tranhoang.finizz@gmail.com',
                  subject: `Warning absent ${project.projectName}`,
                  template: 'email',
                  context: {
                    title: `Warning absent ${project.projectName}`,
                    fullName: `${user.firstName} ${user.lastName}`,
                    content1: `In this ${project.projectName} project, you have missed two classes. If you skip more than three classes, you will be unable to take this project and will fail it. Please pay close attention to this matter.`,
                    content2:
                      'Please contact teacher of this project for more information',
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
    }
  }
}
