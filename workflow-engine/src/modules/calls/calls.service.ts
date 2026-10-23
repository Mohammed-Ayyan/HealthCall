import { CallRepository, callRepository as defaultRepo } from "./calls.repository";
import {
  CreateCallDTO,
  UpdateCallDTO,
  ListCallsQueryDTO,
} from "./calls.validation";
import { NotFoundError } from "../../errors/appError";

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class CallService {
  private repo: CallRepository;

  constructor(repo: CallRepository = defaultRepo) {
    this.repo = repo;
  }

  async createCall(data: CreateCallDTO) {
    return this.repo.create(data);
  }

  async getCallById(id: string) {
    const call = await this.repo.findById(id, true);
    if (!call) {
      throw new NotFoundError(`Call with ID '${id}' not found`);
    }
    return call;
  }

  async listCalls(query: ListCallsQueryDTO): Promise<PaginatedResult<any>> {
    const { calls, total } = await this.repo.findMany(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      data: calls,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  async updateCall(id: string, data: UpdateCallDTO) {
    // Check existence first
    const existing = await this.repo.findById(id, false);
    if (!existing) {
      throw new NotFoundError(`Call with ID '${id}' not found`);
    }

    return this.repo.update(id, data);
  }

  async deleteCall(id: string) {
    // Check existence first
    const existing = await this.repo.findById(id, false);
    if (!existing) {
      throw new NotFoundError(`Call with ID '${id}' not found`);
    }

    return this.repo.delete(id);
  }
}

export const callService = new CallService();
