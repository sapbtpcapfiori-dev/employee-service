using { com.company.hr.employeemanagement as db } from '../db/schema';

@path: '/employee'
service EmployeeService {

    entity Departments as projection on db.Departments;

    entity CompanyLaptops as projection on db.CompanyLaptops;

    entity Employees as projection on db.Employees {
        *,
        email @mandatory,
        virtual salaryCategory : String
    };

    entity Skills as projection on db.Skills;

    entity EmployeeSkillAssignments as projection on db.EmployeeSkillAssignments;

    /*
        Function:
        Read-only calculated/reporting style operation.
        It does not change database data.
    */
    function getEmployeeActiveCount() returns Integer;

    /*
        Function:
        Read-only employee summary.
        It reads employee, department, laptop and skill assignment information.
    */
    function getEmployeeSummary(employeeID : UUID) returns {
        employeeCode : String;
        name         : String;
        email        : String;
        department   : String;
        skillCount   : String;
        laptopStatus : String;
    };

    /*
        Function:
        Read external employee-related information.
        Currently planned for external API demonstration.
    */
    function getExternalEmployeeInfo(employeeID : UUID) returns String;

    /*
        Action:
        Business operation.
        It changes employee status to BLOCKED.
    */
    action blockEmployee(employeeID : UUID) returns Boolean;

    /*
        Action:
        Business process, not simple employee creation.

        It will:
        1. Validate employee data
        2. Validate department
        3. Find available laptop
        4. Create employee
        5. Update laptop as ASSIGNED
        6. Assign default skill
        7. Return created employee
    */
    action onboardEmployee(
        name         : String,
        email        : String,
        designation  : String,
        salary       : Decimal(12,2),
        departmentId : UUID
    ) returns Employees;
}
