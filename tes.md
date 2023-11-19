Dynamic Role Management in SpiceDB

Role-based access control (RBAC) allows organizations to define roles, each with its set of permissions, and assign these roles to users or entities based on their responsibilities and functions. Native RBAC is often first built as a static hierarchy in young organizations, which lasts until their next reorg, merger, or contact with third-parties. Fully-fledged systems require dynamic role management to adapt to real-world ambiguity, internal adaptability and interactions with outside factors.

This article will cover the use-cases for such a system, and then dive into the details of how to implement it using a modern system such as SpiceDB.

## Why?

Dynamic role management extends static RBAC by allowing roles to be created, modified, and revoked dynamically, rather than being static entities predefined in a schema. This flexibility is crucial in scenarios where users or entities take on multiple roles or require temporary access to specific resources. There are three categories of use-cases for this requirement:


1) Multiple roles being held by a single person,
2) Roles that are granted temporarily (interns, contractors, external auditors),
3) Interacting systems of permissions within an org or with outside parties (multi-tenant software)

### Examples of Multiple Roles

#### Emergency Response Team Member

In a disaster or emergency situation, individuals often assume multiple roles simultaneously. For instance, a firefighter may also need to act as a first responder or paramedic, requiring access to different resources and permissions for each role. With dynamic role management, the firefighter's access can be adjusted in real-time based on their active roles.

#### Hospital Staff

Medical professionals in a hospital often need multiple roles based on their specialties. A nurse may have roles as a general nurse, an intensive care nurse, and a surgical nurse, each with distinct access permissions. Dynamic role management ensures that nurses have the appropriate access rights based on their current role within the hospital.

#### Software Developer and Tester

In software development, a developer may also take on the role of a tester when identifying and fixing bugs. These roles require different levels of access to development and testing environments. With dynamic role management, the developer's permissions can change seamlessly as they switch between development and testing tasks.

#### Airlines

A pilot has various roles during a flight, including captain, co-pilot, and flight engineer. Each role carries different responsibilities and permissions for operating the aircraft. Dynamic role management allows airlines to grant and revoke access based on the pilot's assigned role for a particular flight.

#### Educator and Administrator

In educational institutions, teachers may also serve as administrators, responsible for managing course materials, student records, and assessments. These dual roles require separate access rights, which can be managed dynamically to ensure data security and compliance.

#### Financial Analyst and Compliance Officer

Professionals in the finance industry may have roles as financial analysts, but they may also need temporary roles as compliance officers to ensure regulatory requirements are met. Dynamic role management enables organizations to grant and revoke these roles as needed, ensuring compliance without unnecessary access.

#### E-commerce Customer Support Agent

A customer support agent in an e-commerce company may need multiple roles, such as handling customer inquiries and processing refunds. These roles require access to different systems and data. Dynamic role management ensures that agents have the right permissions based on their ongoing tasks and responsibilities.

### Examples of Temporary Access

#### Contractors

When hiring contractors or external consultants, organizations often grant them temporary access to specific systems or data to complete a project. Once the project is finished, their access can be revoked to maintain security. Dynamic role management streamlines this process, allowing organizations to easily manage temporary access.

#### Temporary Employees

Seasonal or temporary employees may require access to company systems, such as payroll or inventory management, for a limited duration during peak business periods. Dynamic role management ensures that temporary employees have access only for the duration of their employment, reducing security risks.

#### Interns

Interns may need access to certain tools and systems during their internship program. Once the internship ends, their access should be revoked to protect sensitive information. Dynamic role management simplifies the onboarding and offboarding of interns, ensuring data security.

#### Temporary Event Staff

Event organizers often provide temporary access to staff for event-related tasks, such as ticket scanning or registration, during events. After the event concludes, their access is no longer needed. Dynamic role management automates the process of granting and revoking access for temporary event staff.

#### Temporary Access for Repairs, or Break-Glass Scenarios

When equipment or machinery requires maintenance or repair by external technicians, they may be granted temporary access to the facility or specific areas to perform their work. Dynamic role management ensures that access is limited to the duration of the repair job, enhancing security.

#### External Auditors

External auditors may need temporary access to an organization's financial and operational data to conduct audits. Once the audit is complete, their access is no longer required. Dynamic role management facilitates seamless auditing processes while maintaining data security.

### Examples of Different Permissions and Roles Between Interacting Organizations

In many real-world scenarios, organizations interact and collaborate, but their roles and permissions differ to align with their distinct responsibilities and functions. Effective role-based access control ensures that each organization can access the necessary resources and perform specific actions while maintaining security and compliance.

#### Supply Chain Partners

Organizations collaborating within a supply chain have varying roles and responsibilities. For instance, a manufacturer, a distributor, and a retailer may each have different roles and permissions for accessing inventory data and managing orders. Dynamic role management ensures that each partner has the appropriate level of access within the supply chain ecosystem.

#### Healthcare Providers and Insurance Companies

In the healthcare industry, healthcare providers and insurance companies have distinct roles and permissions. Healthcare providers access patient records and treatment plans, while insurance companies focus on claims processing and policy management. Dynamic role management ensures that sensitive patient data is protected while enabling efficient collaboration.

#### Financial Institutions and Regulatory Agencies

Financial institutions and regulatory agencies have contrasting roles in the context of financial transactions. Financial institutions manage customer accounts, while regulatory agencies oversee compliance and conduct audits. Dynamic role management ensures that financial data is accurately reported and remains compliant with regulations.

#### Education Institutions and Government Bodies

Educational institutions and government bodies interact but have different roles. Educational institutions manage student data and course content, while government bodies oversee accreditation and funding. Dynamic role management ensures that educational data is secure and compliant with government standards.

#### Technology Providers and Third-Party Developers

Technology providers often collaborate with third-party developers to extend their platforms. The technology provider manages the core platform, while developers have roles related to application development and integration. Dynamic role management ensures that third-party developers have the necessary access to enhance the platform's functionality.

#### Multinational Corporations and Local Subsidiaries

Large multinational corporations and their local subsidiaries have varying roles and permissions. The parent company may handle global financial management, while local subsidiaries manage regional operations and reporting. Dynamic role management enables seamless collaboration while maintaining financial data integrity.

## Why not hierarchies?

[chart 1]

Image of lines growing upward, slowly grouping together but never merging.

In large organizations, the system being requested should decide who can access it because otherwise the possible operations will accumulate in the centralized location. The centralized permissions will either be greatly simplified by applying broad rule-based policies, or will become an expanding list of ever larger names of resources, usually by relying on some kind of legacy namespacing scheme.

The same applies to hierarchies – the usefulness and adaptability of such systems calcifies structures long past when they're useful, and prevents adapting or modifying these systems without a great deal of work. This may not be justifiable within a business, becoming a risk or cost-center rather than value-generating opportunities.

Ideally, every system should be able to drawn in a chart like this:

[chart 2]

This is an ACM, or Access Control Matrix.  By defining roles relative to the resource and the operations that those resource-level roles allow, the system can exist within a changing organization by then associating one or more organizational roles to the resource-specific roles.

This may be orthogonal from a hierarchy.  For example, a doorway may be opened by an employee assigned to a building, by the security company currently hired by the company, by the cleaning staff, or even by construction contractors on a temporary basis.


## Alternatives to Resource-level Role-based Access Control

### 1. Rule-Based Access Control (RuBAC) or Policy-Based Access Control (PBAC)

It can be helpful to ensure security at a broad level to group various systems into specific types and then apply a set of rules or policies to all the resources within that type. This method is quite flexible. However, these rules are usually written using specialized language with specific words to describe complex access requirements. For those who don't primarily deal with security, it might lead to mistakes, incomplete setups, incorrect configurations, or a reluctance to make changes when the business needs them.

### 2. Attributes of the Resource



### 3. Tags, or Applied Properties





Resource-Based Access Control: An access control model where access decisions are based on the characteristics of the resource being accessed.

Tags, or properties of the subject.

Operations, or per-operation gates.

Policies




## Implementation



### Conclusion

Dynamic role management is a critical aspect of modern access control systems, allowing organizations to adapt to changing roles and access requirements. Whether it's managing multiple roles, granting temporary access, or coordinating permissions between interacting organizations, dynamic role management plays a crucial role in ensuring security, compliance, and efficient collaboration.

As software patterns and best practices continue to evolve, incorporating dynamic role management into your systems can enhance their flexibility and security. Are you currently using dynamic role management in your software






Titles:
- Unlocking the Power of Dynamic Role Management in SpiceDB
- Transform your role management from static to dynamic with SpiceDB.
- Simplify role management with SpiceDB's dynamic capabilities. Our tutorial offers insights into building a strong foundation for your access control.


Second paragraph, establish vocabulary?

Why not Static Roles?

Or why not put everything in a hard-coded schema?

- Uniqueness across tenants.  (Klingon Captain vs Federation Captain, or Romulan Captain)
- Versioning
- Hierarchies change, reorg's happen, new tech brings new terms and new structures.
- Tenancy, or outside companies, may not match a system's structure, and asking them to match our world to use our systems with our own vocabulary is a barrier for adoption.

- Multiple roles for a single person, or different roles depending on the project, context or team.







Alternatives



Permissions relative to feature flagging
Adding a role to represent a cohort to grant temporary permissions.


A permission is also an implementation of a policy, or a behavior, such as sending an email after certain actions.

Creating easier, looser roles prevents falling back to "attribute" based permissions.
- relationships are similar to attributes, and can be used as an attribute in many cases, i.e., location is open 24 hours, and saying that only those that are open 24 hours may take certain actions.  Only those with a drive-through may take certain actions.


Policies

Policy Enforcement Point (PEP): A component responsible for intercepting access requests and enforcing access control policies.

Policy Decision Point (PDP): A component responsible for making access control decisions based on defined policies and access requests.

Policy Information Point (PIP): A component that provides additional information needed to make access control decisions, such as user attributes.

Privilege escalation

The creation of a new relationship is a form of privilege escalation and can be part of a workflow if it is not hardcoded into a schema.

Revoking permissions based on the inclusion of roles – Being part of Interns or Provisional might prevent some actions, but should be just another role rather than individual.

Break-Glass Access: Emergency access provisions for specific users or roles in critical situations, often requiring multi-factor authentication.




Am I using "role" correctly?  Do people just have one role, or is it always relative to something?




Principle of Least Astonishment: A design principle that suggests access control systems should behave in ways that are least surprising to users or administrators.




Add a role for a limited time (or add caveats?)  Break glass permission.

Repeated opt-in to sensitive information to prevent legacy access (repeated manager approval).



Examples of multiple roles:

Emergency Response Team Member: In a disaster or emergency situation, an individual may assume multiple roles simultaneously. For example, a firefighter may also need to act as a first responder or paramedic, requiring access to different resources and permissions for each role.

Hospital Staff: Medical professionals in a hospital often need multiple roles based on their specialties. A nurse may have roles as a general nurse, an intensive care nurse, and a surgical nurse, each with distinct access permissions.

Software Developer and Tester: In software development, a developer may also take on the role of a tester when identifying and fixing bugs. These roles require different levels of access to development and testing environments.

Airline Pilot: A pilot has various roles during a flight, including captain, co-pilot, and flight engineer. Each role carries different responsibilities and permissions for operating the aircraft.

Educator and Administrator: In educational institutions, teachers may also serve as administrators, responsible for managing course materials, student records, and assessments. These dual roles require separate access rights.

Financial Analyst and Compliance Officer: Professionals in the finance industry may have roles as financial analysts, but they may also need temporary roles as compliance officers to ensure regulatory requirements are met.

E-commerce Customer Support Agent: A customer support agent in an e-commerce company may need multiple roles, such as handling customer inquiries and processing refunds. These roles require access to different systems and data.


Examples of temporary access

Contractors: When hiring contractors or external consultants, organizations often grant them temporary access to specific systems or data to complete a project. Once the project is finished, their access can be revoked to maintain security.

Temporary Employees: Seasonal or temporary employees may require access to company systems, such as payroll or inventory management, for a limited duration during peak business periods.

Interns: Interns may need access to certain tools and systems during their internship program. Once the internship ends, their access should be revoked to protect sensitive information.

Guest Wi-Fi: In a corporate or public setting, guests may need temporary access to the Wi-Fi network without gaining permanent access to the organization's internal network resources.

Temporary Event Staff: Event organizers often provide temporary access to staff for event-related tasks, such as ticket scanning or registration, during events. After the event concludes, their access is no longer needed.

Temporary Access for Repairs: When equipment or machinery requires maintenance or repair by external technicians, they may be granted temporary access to the facility or specific areas to perform their work.

External Auditors: External auditors may need temporary access to an organization's financial and operational data to conduct audits. Once the audit is complete, their access is no longer required.

Examples for different permissions and roles between interacting organizations

Here are seven real-world use-cases or examples where roles used for permissions would be different between interacting organizations. In these examples, organizations interact and collaborate, but their roles and permissions differ to align with their distinct responsibilities and functions. Effective role-based access control ensures that each organization can access the necessary resources and perform specific actions while maintaining security and compliance.

Supply Chain Partners: Organizations collaborating within a supply chain have varying roles and responsibilities. For instance, a manufacturer, a distributor, and a retailer may each have different roles and permissions for accessing inventory data and managing orders.

Healthcare Providers and Insurance Companies: In the healthcare industry, healthcare providers and insurance companies have distinct roles and permissions. Healthcare providers access patient records and treatment plans, while insurance companies focus on claims processing and policy management.

E-commerce Marketplace: In an e-commerce marketplace, sellers and buyers have different roles and permissions. Sellers require access to product listings and order processing, while buyers need access to product searches and purchases.

Financial Institutions and Regulatory Agencies: Financial institutions and regulatory agencies have contrasting roles in the context of financial transactions. Financial institutions manage customer accounts, while regulatory agencies oversee compliance and conduct audits.

Education Institutions and Government Bodies: Educational institutions and government bodies interact but have different roles. Educational institutions manage student data and course content, while government bodies oversee accreditation and funding.

Technology Providers and Third-Party Developers: Technology providers often collaborate with third-party developers to extend their platforms. The technology provider manages the core platform, while developers have roles related to application development and integration.

Multinational Corporations and Local Subsidiaries: Large multinational corporations and their local subsidiaries have varying roles and permissions. The parent company may handle global financial management, while local subsidiaries manage regional operations and reporting.

