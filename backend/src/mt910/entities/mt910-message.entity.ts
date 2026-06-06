import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('mt910_messages')
@Unique(['senderReference', 'accountIdentification'])
export class Mt910Message {
  @PrimaryGeneratedColumn()
  id: number;

  /** :20: Sender's Reference */
  @Column({ nullable: true })
  senderReference: string;

  /** :21: Related Reference */
  @Column({ nullable: true })
  relatedReference: string;

  /** :25: Account Identification */
  @Column({ nullable: true })
  accountIdentification: string;

  /** :32A: Value Date (YYYY-MM-DD) */
  @Column({ nullable: true })
  valueDate: string;

  /** :32A: Currency Code */
  @Column({ nullable: true })
  currency: string;

  /** :32A: Amount */
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount: number;

  /** :50: Ordering Customer */
  @Column({ type: 'text', nullable: true })
  orderingCustomer: string;

  /** :52: Ordering Institution */
  @Column({ type: 'text', nullable: true })
  orderingInstitution: string;

  /** :56: Intermediary Institution */
  @Column({ type: 'text', nullable: true })
  intermediary: string;

  /** :72: Sender to Receiver Information */
  @Column({ type: 'text', nullable: true })
  senderToReceiverInfo: string;

  /** :72: SWIFT qualifier, e.g. REC in /REC/... */
  @Column({ nullable: true })
  senderToReceiverQualifier: string;

  /** Derived from :72: for meaningful grouping */
  @Column({ nullable: true })
  senderToReceiverCategory: string;

  /** Human-friendly category label derived from :72: */
  @Column({ nullable: true })
  senderToReceiverCategoryLabel: string;

  /** Original file name */
  @Column()
  fileName: string;

  /** Full raw content of the file */
  @Column({ type: 'text' })
  rawContent: string;

  /** When the file was processed */
  @Column()
  processedAt: string;

  /** Message Type: MT910 (Credit) or MT900 (Debit) */
  @Column({ default: 'MT910' })
  messageType: 'MT910' | 'MT900';

  @CreateDateColumn()
  createdAt: Date;
}
