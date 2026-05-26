using { com.company.hr.employeemanagement as db } from '../db/schema';

@path: '/employee'
service EmployeeService {

    entity Departments as projection on db.Departments;
    entity CompanyLaptops as projection on db.CompanyLaptops; 
     entity Employees as projection on db.Employees { 
        *, 
        virtual salaryCategory : String 
    };
    entity Skills as projection on db.Skills; 
    entity EmployeeSkillAssignments as projection on db.EmployeeSkillAssignments; 

    function getEmployeeActiveCount() returns Integer;  // Reading data from backend sources

    function getEmployeeSummary(employeeID : UUID) returns {
        employeeCode : String;
        name : String;
        email : String;
        department : String;
        skillCount : String;
        laptopStatus : String;
    };

    // DB - HANA/Sqlite, // API

    function getExternalEmployeeInfo(employeeID : UUID) returns String;

    action blockEmployee(employeeID : UUID) returns Boolean;

    action onboardEmployee(
        name : String,
        email : String,
        designation : String,
        salary : Decimal(10,2),
        departmentId : UUID
    ) returns Employees;

}

