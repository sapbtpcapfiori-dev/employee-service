using { cuid, managed } from '@sap/cds/common';

namespace com.company.hr.employeemanagement;

type EmployeeStatus : String(20) enum { 
    ACTIVE; 
    INACTIVE; 
    BLOCKED; 
} 
 
type LaptopStatus : String(20) enum { 
    AVAILABLE; 
    ASSIGNED; 
    REPAIR; 
} 
 
type SkillLevel : String(20) enum { 
    BEGINNER; 
    INTERMEDIATE; 
    ADVANCED; 
}

entity Departments : cuid, managed { 
    departmentCode : String(10); 
    name           : String(100); 
    employees      : Association to many Employees 
                        on employees.department = $self; 
}

entity CompanyLaptops : cuid, managed { 
    serialNo : String(30); 
    brand    : String(30); 
    model    : String(30); 
    status   : LaptopStatus default 'AVAILABLE'; 
}

entity Employees : cuid, managed { 
    employeeCode     : String(20); 
    name             : String(100); 
    email            : String(100); 
    designation      : String(60); 
    salary           : Decimal(12,2); 
    status           : EmployeeStatus default 'ACTIVE'; 
 
    department       : Association to Departments; 
    laptop           : Association to CompanyLaptops; 
 
    skillAssignments : Composition of many EmployeeSkillAssignments 
                          on skillAssignments.employee = $self; 
}

entity Skills : cuid, managed { 
    skillCode           : String(20); 
    name                : String(100); 
    category            : String(50); 
 
    employeeAssignments : Association to many EmployeeSkillAssignments 
                              on employeeAssignments.skill = $self; 
} 
 
entity EmployeeSkillAssignments : cuid, managed { 
    employee : Association to Employees; 
    skill    : Association to Skills; 
    level    : SkillLevel; 
}


