const cds = require('@sap/cds')

module.exports = class EmployeeService extends cds.ApplicationService {

  init() {
    const LOG = cds.log('employee-service')

    const {
      Departments,
      Employees,
      CompanyLaptops,
      Skills,
      EmployeeSkillAssignments
    } = this.entities

    /*
      CRUDQ Custom Handler:
      This will run only when consumer directly creates employee using:
      POST /Employees
    */
    this.before('CREATE', Employees, (req) => {
      this.validateEmployeeData(req)
      this.applyEmployeeDefaults(req.data, LOG)
    })

    /*
      CRUDQ Custom Handler:
      This will run when employees are read.
      It calculates virtual salaryCategory.
    */
    this.after('READ', Employees, (employees) => {
      this.addSalaryCategory(employees)
    })

    /*
      Function:
      Read-only calculated operation.
    */
    this.on('getEmployeeActiveCount', async () => {
      const activeEmployees = await SELECT
        .from(Employees)
        .where({ status: 'ACTIVE' })

      return activeEmployees.length
    })

    /*
      Function:
      Read-only employee summary.
    */
    this.on('getEmployeeSummary', async (req) => {
      const { employeeID } = req.data

      if (!employeeID) {
        return req.reject(400, 'Employee ID is mandatory')
      }

      const employee = await SELECT.one
        .from(Employees)
        .columns(
          'ID',
          'employeeCode',
          'name',
          'email',
          'designation',
          'salary',
          'status',
          { department: ['ID', 'name'] },
          { laptop: ['ID', 'status'] }
        )
        .where({ ID: employeeID })

      if (!employee) {
        return req.reject(404, 'Employee not found')
      }

      const skillAssignments = await SELECT
        .from(EmployeeSkillAssignments)
        .where({ employee_ID: employeeID })

      return {
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        department: employee.department?.name || 'Not Assigned',
        skillCount: String(skillAssignments.length),
        laptopStatus: employee.laptop?.status || 'Not Assigned'
      }
    })

    /*
      Action:
      Business operation to block employee.
    */
    this.on('blockEmployee', async (req) => {
      const { employeeID } = req.data

      if (!employeeID) {
        return req.reject(400, 'Employee ID is mandatory')
      }

      const tx = cds.transaction(req)

      const employee = await tx.run(
        SELECT.one.from(Employees).where({ ID: employeeID })
      )

      if (!employee) {
        return req.reject(404, 'Employee not found')
      }

      if (employee.status === 'BLOCKED') {
        return req.reject(400, 'Employee is already blocked')
      }

      await tx.run(
        UPDATE(Employees)
          .set({ status: 'BLOCKED' })
          .where({ ID: employeeID })
      )

      return true
    })

    /*
      Action:
      Complete employee onboarding business process.

      This is intentionally different from POST /Employees.
      It performs multiple business steps in one transaction.
    */
    this.on('onboardEmployee', async (req) => {
      const LOG = cds.log('employee-onboarding')

      const {
        name,
        email,
        designation,
        salary,
        departmentId
      } = req.data

      const tx = cds.tx(req)

      /*
        Step 1:
        Validate input data.
      */
      this.validateEmployeeInput({
        name,
        email,
        designation,
        salary
      })

      if (!departmentId) {
        return req.reject(400, 'Department ID is mandatory')
      }

      /*
        Step 2:
        Validate department.
      */
      const department = await tx.run(
        SELECT.one
          .from(Departments)
          .where({ ID: departmentId })
      )

      if (!department) {
        return req.reject(404, 'Department not found')
      }

      /*
        Step 3:
        Find one available laptop.
        This is what makes onboarding different from normal employee creation.
      */
      const availableLaptop = await tx.run(
        SELECT.one
          .from(CompanyLaptops)
          .where({ status: 'AVAILABLE' })
          .orderBy('createdAt')
      )

      if (!availableLaptop) {
        return req.reject(400, 'No available laptop found for onboarding')
      }

      /*
        Step 4:
        Find default skill.

        For training purpose, we use SAP CAP as default skill.
        In real projects, this can come from configuration table.
      */
      const defaultSkill = await tx.run(
        SELECT.one
          .from(Skills)
          .where({ skillCode: 'SKILL_CAP' })
      )

      if (!defaultSkill) {
        return req.reject(400, 'Default onboarding skill SKILL_CAP not found')
      }

      /*
        Step 5:
        Prepare employee data.
        We are not duplicating employee code generation.
        We are reusing helper method generateEmployeeCodeValue().
      */
      const employeeID = cds.utils.uuid()

      const employeeData = {
        ID: employeeID,
        employeeCode: this.generateEmployeeCodeValue(),
        name,
        email,
        designation,
        salary,
        status: 'ACTIVE',
        department_ID: departmentId,
        laptop_ID: availableLaptop.ID
      }

      /*
        Step 6:
        Create employee.
      */
      await tx.run(
        INSERT.into(Employees).entries(employeeData)
      )

      /*
        Step 7:
        Update laptop status as ASSIGNED.
      */
      await tx.run(
        UPDATE(CompanyLaptops)
          .set({ status: 'ASSIGNED' })
          .where({ ID: availableLaptop.ID })
      )

      /*
        Step 8:
        Assign default skill to employee.
      */
      await tx.run(
        INSERT.into(EmployeeSkillAssignments).entries({
          ID: cds.utils.uuid(),
          employee_ID: employeeID,
          skill_ID: defaultSkill.ID,
          level: 'BEGINNER'
        })
      )

      LOG.info(`Employee onboarded successfully: ${employeeData.employeeCode}`)

      /*
        Step 9:
        Return created employee.
      */
      const createdEmployee = await tx.run(
        SELECT.one
          .from(Employees)
          .where({ ID: employeeID })
      )

      return createdEmployee
    })

    /*
      External API function placeholder.
      You can implement this in the next session.
    */
    this.on('getExternalEmployeeInfo', async (req) => {
      const { employeeID } = req.data

      if (!employeeID) {
        return req.reject(400, 'Employee ID is mandatory')
      }

      const employee = await SELECT.one
        .from(Employees)
        .where({ ID: employeeID })

      if (!employee) {
        return req.reject(404, 'Employee not found')
      }

      return `External employee information will be fetched for ${employee.name} in external API integration session`
    })

    return super.init()
  }

  /*
    Used by POST /Employees.
  */
  validateEmployeeData(req) {
    this.validateEmployeeInput(req.data)
  }

  /*
    Common validation method.
    Used by:
    1. POST /Employees
    2. onboardEmployee action
  */
  validateEmployeeInput(data) {
    const { name, email, designation, salary } = data

    if (!name) {
      throw new cds.error('Employee name is mandatory', { code: 400 })
    }

    if (!email) {
      throw new cds.error('Employee email is mandatory', { code: 400 })
    }

    if (!email.endsWith('@company.com')) {
      throw new cds.error('Only company email is allowed', { code: 400 })
    }

    if (!designation) {
      throw new cds.error('Designation is mandatory', { code: 400 })
    }

    if (salary === undefined || salary === null) {
      throw new cds.error('Salary is mandatory', { code: 400 })
    }

    if (designation.toLowerCase() === 'developer' && Number(salary) < 30000) {
      throw new cds.error('Developer salary should be at least 30000', { code: 400 })
    }
  }

  /*
    Used by POST /Employees.
    Adds default values before saving.
  */
  applyEmployeeDefaults(data, LOG) {
    if (!data.employeeCode) {
      data.employeeCode = this.generateEmployeeCodeValue()
      LOG.info(`Employee code generated: ${data.employeeCode}`)
    }

    if (!data.status) {
      data.status = 'ACTIVE'
    }
  }

  /*
    Single place for employee code generation.

    This avoids writing:
    EMP-${Date.now()}
    in multiple places.
  */
  generateEmployeeCodeValue() {
    return `EMP-${Date.now()}`
  }

  /*
    Used by after READ handler.
    Calculates virtual salaryCategory.
  */
  addSalaryCategory(employees) {
    const employeeList = Array.isArray(employees) ? employees : [employees]

    employeeList.forEach((employee) => {
      if (!employee) return

      if (Number(employee.salary) >= 80000) {
        employee.salaryCategory = 'HIGH'
      } else if (Number(employee.salary) >= 50000) {
        employee.salaryCategory = 'MEDIUM'
      } else {
        employee.salaryCategory = 'LOW'
      }
    })
  }
}
