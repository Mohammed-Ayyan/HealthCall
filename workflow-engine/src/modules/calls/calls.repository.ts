import { PrismaClient, Call, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client";
import {
  CreateCallDTO,
  UpdateCallDTO,
  ListCallsQueryDTO,
} from "./calls.validation";

export class CallRepository {
  private db: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.db = client;
  }

  async create(data: CreateCallDTO): Promise<Call> {
    return this.db.call.create({
      data: {
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientMrn: data.patientMrn,
        transcript: data.transcript,
        summary: data.summary,
        detectedIntent: data.detectedIntent,
        priority: data.priority,
        sentiment: data.sentiment,
        callTimestamp: data.callTimestamp,
      },
    });
  }

  async findById(id: string, includeTasks = true) {
    return this.db.call.findUnique({
      where: { id },
      include: includeTasks
        ? {
            tasks: {
              include: {
                department: {
                  select: { id: true, name: true },
                },
                assignedEmployee: {
                  select: { id: true, fullName: true, email: true, role: true },
                },
              },
            },
          }
        : undefined,
    });
  }

  async findMany(query: ListCallsQueryDTO) {
    const { page, limit, patientPhone, detectedIntent, priority, sentiment } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CallWhereInput = {};

    if (patientPhone) {
      where.patientPhone = {
        contains: patientPhone,
        mode: "insensitive",
      };
    }

    if (detectedIntent) {
      where.detectedIntent = {
        contains: detectedIntent,
        mode: "insensitive",
      };
    }

    if (priority) {
      where.priority = priority;
    }

    if (sentiment) {
      where.sentiment = sentiment;
    }

    const [calls, total] = await Promise.all([
      this.db.call.findMany({
        where,
        skip,
        take: limit,
        orderBy: { callTimestamp: "desc" },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      }),
      this.db.call.count({ where }),
    ]);

    return { calls, total };
  }

  async update(id: string, data: UpdateCallDTO): Promise<Call> {
    return this.db.call.update({
      where: { id },
      data: {
        ...(data.patientName !== undefined && { patientName: data.patientName }),
        ...(data.patientPhone !== undefined && { patientPhone: data.patientPhone }),
        ...(data.patientMrn !== undefined && { patientMrn: data.patientMrn }),
        ...(data.transcript !== undefined && { transcript: data.transcript }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.detectedIntent !== undefined && { detectedIntent: data.detectedIntent }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.sentiment !== undefined && { sentiment: data.sentiment }),
        ...(data.callTimestamp !== undefined && { callTimestamp: data.callTimestamp }),
      },
    });
  }

  async delete(id: string): Promise<Call> {
    return this.db.call.delete({
      where: { id },
    });
  }
}

export const callRepository = new CallRepository();
