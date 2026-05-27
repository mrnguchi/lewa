import type { AdminStudentDistribution } from "@/lib/admin-api";

import { UB_FACULTY_DEPARTMENTS } from "../constants/ub-academics";

// I normalize department rows here so empty official departments still show up cleanly.
export const getOfficialDepartmentRows = (
  distribution: AdminStudentDistribution | null,
  scopedDepartment?: string | null,
) => {
  if (!distribution) {
    return [];
  }

  if (scopedDepartment) {
    return distribution.departments.length > 0
      ? distribution.departments
      : [
          {
            name: scopedDepartment,
            total: 0,
            active: 0,
            inactive: 0,
            paid: 0,
            partial: 0,
            notPaid: 0,
          },
        ];
  }

  const officialDepartments =
    UB_FACULTY_DEPARTMENTS[distribution.selectedFaculty] ?? [];
  const departmentMap = new Map(
    distribution.departments.map((department) => [department.name, department]),
  );

  if (!officialDepartments.length) {
    return distribution.departments;
  }

  const officialRows = officialDepartments.map((departmentName) => {
    const department = departmentMap.get(departmentName);

    return {
      name: departmentName,
      total: department?.total ?? 0,
      active: department?.active ?? 0,
      inactive: department?.inactive ?? 0,
      paid: department?.paid ?? 0,
      partial: department?.partial ?? 0,
      notPaid: department?.notPaid ?? 0,
    };
  });

  const extraRows = distribution.departments.filter(
    (department) => !officialDepartments.includes(department.name),
  );

  return [...officialRows, ...extraRows].sort(
    (left, right) => right.total - left.total || left.name.localeCompare(right.name),
  );
};
