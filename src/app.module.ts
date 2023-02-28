import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendaceService } from 'attendance.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import {
  StudentSchedules,
  StudentSchedulesSchema,
} from '@schemas/student-schedule.schema';
import {
  EmailAttendance,
  EmailAttendanceSchema,
} from '@schemas/email-attandance.schema';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { Project, ProjectSchema, User, UserSchema } from './schemas';
import {
  StudentDisabled,
  StudentDisabledSchema,
} from '@schemas/student-disabled.schema';
import { StudentJoin, StudentJoinSchema } from '@schemas/student-join.schema';
import {
  ProjectSchedule,
  ProjectScheduleSchema,
} from '@schemas/project-schedule.schema';
import { WarningService } from 'warning.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/attendance'),
    MongooseModule.forFeature([
      { name: StudentSchedules.name, schema: StudentSchedulesSchema },
    ]),
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    MongooseModule.forFeature([
      { name: EmailAttendance.name, schema: EmailAttendanceSchema },
    ]),
    MongooseModule.forFeature([
      { name: StudentDisabled.name, schema: StudentDisabledSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    MongooseModule.forFeature([
      { name: StudentJoin.name, schema: StudentJoinSchema },
    ]),
    MongooseModule.forFeature([
      { name: ProjectSchedule.name, schema: ProjectScheduleSchema },
    ]),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.sendgrid.net',
        auth: {
          user: 'apikey',
          pass: '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',
        },
      },
      template: {
        dir: join(__dirname, 'mails'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AttendaceService, WarningService],
})
export class AppModule {}
