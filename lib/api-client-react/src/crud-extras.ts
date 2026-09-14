import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";
import type {
  ClassGroup,
  ClassGroupInput,
  Expense,
  ExpenseInput,
  Fee,
  FeeInput,
  School,
  SchoolInput,
  Student,
  StudentInput,
} from "./generated/api.schemas";

type UpdateVars<TInput> = { id: number; data: Partial<TInput> };
type DeleteVars = { id: number };
type DeleteResult = { success: true };

function useUpdateResource<TInput, TOutput>(
  path: string,
  options?: { mutation?: UseMutationOptions<TOutput, ErrorType<unknown>, UpdateVars<TInput>> },
) {
  return useMutation({
    mutationFn: ({ id, data }: UpdateVars<TInput>) =>
      customFetch<TOutput>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    ...options?.mutation,
  });
}

function useDeleteResource(
  path: string,
  options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> },
) {
  return useMutation({
    mutationFn: ({ id }: DeleteVars) => customFetch<DeleteResult>(`${path}/${id}`, { method: "DELETE" }),
    ...options?.mutation,
  });
}

export const useUpdateSchool = (options?: { mutation?: UseMutationOptions<School, ErrorType<unknown>, UpdateVars<SchoolInput>> }) =>
  useUpdateResource<SchoolInput, School>("/api/schools", options);
export const useDeleteSchool = (options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> }) =>
  useDeleteResource("/api/schools", options);

export const useUpdateClass = (options?: { mutation?: UseMutationOptions<ClassGroup, ErrorType<unknown>, UpdateVars<ClassGroupInput>> }) =>
  useUpdateResource<ClassGroupInput, ClassGroup>("/api/classes", options);
export const useDeleteClass = (options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> }) =>
  useDeleteResource("/api/classes", options);

export const useUpdateStudent = (options?: { mutation?: UseMutationOptions<Student, ErrorType<unknown>, UpdateVars<StudentInput>> }) =>
  useUpdateResource<StudentInput, Student>("/api/students", options);
export const useDeleteStudent = (options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> }) =>
  useDeleteResource("/api/students", options);

export const useUpdateFee = (options?: { mutation?: UseMutationOptions<Fee, ErrorType<unknown>, UpdateVars<FeeInput>> }) =>
  useUpdateResource<FeeInput, Fee>("/api/fees", options);
export const useDeleteFee = (options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> }) =>
  useDeleteResource("/api/fees", options);

export const useUpdateExpense = (options?: { mutation?: UseMutationOptions<Expense, ErrorType<unknown>, UpdateVars<ExpenseInput>> }) =>
  useUpdateResource<ExpenseInput, Expense>("/api/expenses", options);
export const useDeleteExpense = (options?: { mutation?: UseMutationOptions<DeleteResult, ErrorType<unknown>, DeleteVars> }) =>
  useDeleteResource("/api/expenses", options);
