import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import {
  ProjectSchedule,
  ProjectScheduleDocument,
} from '@schemas/project-schedule.schema';
import {
  StudentDisabled,
  StudentDisabledDocument,
} from '@schemas/student-disabled.schema';
import { StudentJoin, StudentJoinDocument } from '@schemas/student-join.schema';
import { CronJob } from 'cron';

import * as moment from 'moment';
import { Model } from 'mongoose';
import { Project, ProjectDocument, User, UserDocument } from './schemas';

@Injectable()
export class WarningService {
  constructor(
    @InjectModel(StudentJoin.name)
    private studentJoinModel: Model<StudentJoinDocument>,
    @InjectModel(ProjectSchedule.name)
    private projectScheduleModel: Model<ProjectScheduleDocument>,
    @InjectModel(StudentDisabled.name)
    private studentDisabledModel: Model<StudentDisabledDocument>,
    @InjectModel(User.name)
    private usersModal: Model<UserDocument>,
    @InjectModel(Project.name)
    private projectModal: Model<ProjectDocument>,
    private mailService: MailerService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    const projectSchedules = await this.projectScheduleModel.find();
    for (const project of projectSchedules) {
      const projectId = project.projectId;
      const students = await this.studentJoinModel.findOne({ projectId });
      if (!students) continue;
      for (const student of students.studentsJoined) {
        let totalLeaveDate = 0;
        for (const schedule of project.schedules) {
          if (moment(new Date(schedule.startTime)).isAfter(moment())) {
            continue;
          }
          let isJoin = true;
          for (const attendance of schedule.attendanceAt) {
            if (!attendance.studentJoined.includes(student)) {
              isJoin = false;
            }
          }
          if (!isJoin) {
            totalLeaveDate++;
          }
        }
        if (totalLeaveDate >= 3) {
          console.log('leave student from project');
          const foundDisabled = await this.studentDisabledModel.findOne({
            projectId: projectId,
          });
          const cronJobName = `${student}-${projectId}-${totalLeaveDate}-blocked`;
          try {
            this.schedulerRegistry.getCronJob(cronJobName);
          } catch {
            const job = new CronJob(
              moment().add(2, 'seconds').toDate(),
              async () => {
                if (foundDisabled) {
                  const studentIds = [...foundDisabled.studentsDisabled];
                  if (!studentIds.includes(student)) {
                    studentIds.push(student);
                    foundDisabled.studentsDisabled = studentIds;
                    await foundDisabled.save();
                  }
                } else {
                  const studentId = student;
                  const newDisabled = new this.studentDisabledModel({
                    projectId: projectId,
                    studentsDisabled: [studentId],
                  });
                  await newDisabled.save();
                }
              },
            );
            this.schedulerRegistry.addCronJob(cronJobName, job);
            job.start();
          }
        } else if (totalLeaveDate >= 2) {
          const cronJobName = `${student}-${projectId}-${totalLeaveDate}-warning`;
          const user = await this.usersModal.findById(student);
          const project = await this.projectModal.findById(projectId);
          try {
            this.schedulerRegistry.getCronJob(cronJobName);
          } catch {
            const job = new CronJob(
              moment().add(2, 'seconds').toDate(),
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
