const cds = require('@sap/cds')

module.exports = class EmployeeService extends cds.ApplicationService {
  init() {
    const LOG = cds.log('employee-servicexxx')
    const { Departments, Employees, CompanyLaptops, EmployeeSkillAssignments, Skills } = cds.entities('EmployeeService')

    this.before('CREATE', Employees, (req) => {
      this.validateEmployeeData(req, LOG)
    })

    return super.init()
  }

  // custom functions

  validateEmployeeData(req, LOG) {
    const { name, email ,designation, salary  } = req.data;
    if (!name) {
      LOG.error(`Name is missing in entitySet Employeee, the value of name is ${name} `)
      return req.reject(400, 'Employee name is mandatory')
    }
    if (!email) {
      return req.reject(400, 'Email is mandatory')
    }
    if(!email.endsWith('@company.com')){
      return req.reject(400, 'Only Company email is allowed')
    }
    if(designation.toLowerCase() === 'developer' && salary < 30000){
      return req.error(400, 'Developer salary should be at least 30000')
    }


  }
}
