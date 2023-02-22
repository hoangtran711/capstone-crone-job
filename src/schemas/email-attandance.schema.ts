import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailAttendanceDocument = EmailAttendance & Document;

@Schema()
export class EmailAttendance {
  @Prop({ required: true })
  studentId: string;

  @Prop({ required: true })
  sentItemIndex: number[];
}

export const EmailAttendanceSchema =
  SchemaFactory.createForClass(EmailAttendance);
