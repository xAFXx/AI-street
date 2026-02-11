import { Injectable } from '@angular/core';
import { Report } from '../models/report.model';
import { Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReportDataService {
    private reports: Report[] = [
        {
            id: '1',
            title: 'Insurance Claim #88291-B',
            template: 'Damage Report',
            status: 'Draft',
            lastModified: new Date('2026-01-25'),
            progress: 45,
            chapters: [
                {
                    key: 'overview',
                    label: '1. Overview',
                    expanded: true,
                    children: [
                        {
                            key: 'summary',
                            label: '1.1 Summary',
                            blocks: [
                                {
                                    id: 'b1',
                                    text: '<p>This report documents the damage assessment for property located at 123 Main Street following the incident on January 15, 2026. The assessment includes structural damage, interior damage, and estimated repair costs.</p>'
                                }
                            ]
                        },
                        { key: 'scope', label: '1.2 Scope' }
                    ]
                },
                {
                    key: 'assessment',
                    label: '2. Damage Assessment',
                    children: [
                        { key: 'structure', label: '2.1 Structural' },
                        { key: 'interior', label: '2.2 Interior' }
                    ]
                },
                {
                    key: 'costs',
                    label: '3. Cost Estimation'
                }
            ],
            referenceDocs: [
                { id: '1', title: 'Policy Handbook', type: 'pdf', description: 'Standard insurance policy guidelines.' },
                { id: '2', title: 'Inspection Checklist', type: 'doc', description: 'Required items for property assessment.' },
                { id: '3', title: 'Site Photos', type: 'image', description: 'Photos from the site visit.' }
            ]
        },
        {
            id: '2',
            title: 'Property Assessment #12345',
            template: 'Property Inspection',
            status: 'Final',
            lastModified: new Date('2026-01-24'),
            progress: 100,
            chapters: [
                {
                    key: 'property-info',
                    label: '1. Property Information',
                    expanded: true,
                    children: [
                        {
                            key: 'location',
                            label: '1.1 Location',
                            blocks: [
                                {
                                    id: 'b1',
                                    text: '<p>Property located at 456 Oak Avenue, Springfield. The property consists of a two-story residential building with approximately 2,500 square feet of living space.</p>'
                                }
                            ]
                        },
                        { key: 'ownership', label: '1.2 Ownership Details' }
                    ]
                },
                {
                    key: 'condition',
                    label: '2. Condition Assessment',
                    children: [
                        { key: 'exterior', label: '2.1 Exterior' },
                        { key: 'interior', label: '2.2 Interior' }
                    ]
                }
            ],
            referenceDocs: [
                { id: '4', title: 'Property Deed', type: 'pdf', description: 'Official property ownership documents.' },
                { id: '5', title: 'Previous Inspection', type: 'pdf', description: 'Last inspection report from 2024.' }
            ]
        },
        {
            id: '3',
            title: 'Incident Report #99887',
            template: 'Incident Documentation',
            status: 'Approved',
            lastModified: new Date('2026-01-23'),
            progress: 100,
            chapters: [
                {
                    key: 'incident-details',
                    label: '1. Incident Details',
                    expanded: true,
                    children: [
                        {
                            key: 'date-time',
                            label: '1.1 Date and Time',
                            blocks: [
                                {
                                    id: 'b1',
                                    text: '<p>Incident occurred on January 20, 2026 at approximately 14:30 hours. Weather conditions were clear with moderate winds.</p>'
                                }
                            ]
                        },
                        { key: 'parties', label: '1.2 Parties Involved' }
                    ]
                },
                {
                    key: 'findings',
                    label: '2. Findings',
                    children: [
                        { key: 'observations', label: '2.1 Observations' },
                        { key: 'conclusions', label: '2.2 Conclusions' }
                    ]
                }
            ],
            referenceDocs: [
                { id: '6', title: 'Police Report', type: 'pdf', description: 'Official police incident report.' },
                { id: '7', title: 'Witness Statements', type: 'doc', description: 'Collected witness testimonies.' }
            ]
        },
        {
            id: '4',
            title: 'Compliance Audit #2026-Q1',
            template: 'Audit Report',
            status: 'Draft',
            lastModified: new Date('2026-01-22'),
            progress: 30,
            chapters: [
                {
                    key: 'audit-scope',
                    label: '1. Audit Scope',
                    expanded: true,
                    children: [
                        { key: 'objectives', label: '1.1 Objectives' },
                        { key: 'methodology', label: '1.2 Methodology' }
                    ]
                },
                {
                    key: 'findings',
                    label: '2. Audit Findings',
                    children: [
                        { key: 'compliance', label: '2.1 Compliance Status' },
                        { key: 'recommendations', label: '2.2 Recommendations' }
                    ]
                }
            ],
            referenceDocs: [
                { id: '8', title: 'Compliance Standards', type: 'pdf', description: 'Industry compliance requirements.' },
                { id: '9', title: 'Previous Audit', type: 'pdf', description: 'Q4 2025 audit report.' }
            ]
        },
        {
            id: '5',
            title: 'Audit Report for Social Responsible Process Management',
            template: 'SRPM Audit',
            status: 'Draft',
            lastModified: new Date('2026-01-27'),
            progress: 65,
            chapters: [
                {
                    key: 'org-data',
                    label: '1. Organization Data',
                    expanded: true,
                    children: [
                        {
                            key: 'general-info', label: '1.1 General Information', blocks: [
                                { id: 'b5-1', text: '<p><strong>Organization Name:</strong> Sample Corporation B.V.</p><p><strong>Address:</strong> Business Park 123, 1234 AB Amsterdam</p><p><strong>Industry:</strong> Financial Services / Credit Management</p><p><strong>Number of Employees:</strong> 125 FTE</p>' }
                            ]
                        },
                        {
                            key: 'contact-details', label: '1.2 Contact Details', blocks: [
                                { id: 'b5-2', text: '<p><strong>Primary Contact:</strong> John Smith, Quality Manager</p><p><strong>Email:</strong> j.smith@samplecorp.com</p><p><strong>Phone:</strong> +31 20 123 4567</p><p><strong>Website:</strong> www.samplecorp.com</p>' }
                            ]
                        },
                        {
                            key: 'scope', label: '1.3 Audit Scope', blocks: [
                                { id: 'b5-3', text: '<p>This Phase 2 certification audit covers all operational processes related to Social Responsible Process Management, including credit management operations, customer relations, employee welfare programs, and environmental sustainability initiatives.</p><p>The audit scope includes all departments at the main office location and covers the period from January 2025 to January 2026.</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'general-assessment',
                    label: '2. General Assessment',
                    children: [
                        {
                            key: 'audit-type', label: '2.1 Audit Type & Phase', blocks: [
                                { id: 'b5-4', text: '<p><strong>Audit Type:</strong> Certification Audit</p><p><strong>Phase:</strong> Phase 2 - Full Assessment</p><p><strong>Standard Version:</strong> SRPM Framework v4.0 (October 2024)</p><p>This Phase 2 audit follows the successful completion of Phase 1 documentation review conducted in December 2025.</p>' }
                            ]
                        },
                        {
                            key: 'audit-date', label: '2.2 Audit Date & Duration', blocks: [
                                { id: 'b5-5', text: '<p><strong>Audit Start Date:</strong> January 20, 2026</p><p><strong>Audit End Date:</strong> January 22, 2026</p><p><strong>Total Duration:</strong> 3 days (24 audit hours)</p><p><strong>Remote/On-site:</strong> Combination - Day 1 remote, Days 2-3 on-site</p>' }
                            ]
                        },
                        {
                            key: 'auditor-info', label: '2.3 Auditor Information', blocks: [
                                { id: 'b5-6', text: '<p><strong>Lead Auditor:</strong> Maria Johnson, SRPM Certified Auditor</p><p><strong>Auditor ID:</strong> SRPM-AUD-2024-0892</p><p><strong>Certification Body:</strong> Quality Certification International</p><p><strong>Technical Expert:</strong> Dr. Peter Williams (Credit Management Specialist)</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'deviations',
                    label: '3. Deviations and Improvements',
                    children: [
                        {
                            key: 'major-deviations', label: '3.1 Major Deviations (A)', blocks: [
                                { id: 'b5-7', text: '<p><strong>No major deviations (A-findings) were identified during this audit.</strong></p><p>The organization demonstrates strong compliance with all critical requirements of the SRPM framework.</p>' }
                            ]
                        },
                        {
                            key: 'minor-deviations', label: '3.2 Minor Deviations (B)', blocks: [
                                { id: 'b5-8', text: '<p><strong>B-1: Documentation Gap</strong></p><p>The procedure for handling vulnerable customer complaints is not fully documented. While staff demonstrated good practical knowledge, formal documentation should be updated.</p><p><em>Requirement Reference:</em> SRPM 5.3.2</p><p><strong>B-2: Training Records</strong></p><p>Training records for the new sustainability program are incomplete for 3 out of 45 employees.</p><p><em>Requirement Reference:</em> SRPM 5.4.1</p>' }
                            ]
                        },
                        {
                            key: 'improvement-actions', label: '3.3 Improvement Actions', blocks: [
                                { id: 'b5-9', text: '<p><strong>Recommended Improvements:</strong></p><ul><li>Complete documentation update for vulnerable customer handling procedures by March 2026</li><li>Ensure all training records are digitized and maintained in the central HR system</li><li>Consider implementing quarterly internal audits to maintain compliance levels</li></ul>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'previous-audit',
                    label: '4. Evaluation of Previous Audit',
                    children: [
                        {
                            key: 'previous-findings', label: '4.1 Previous Findings', blocks: [
                                { id: 'b5-10', text: '<p><strong>Phase 1 Audit Findings (December 2025):</strong></p><ul><li>Finding P1-1: Quality manual required updates for new SRPM v4.0 requirements - <em>CLOSED</em></li><li>Finding P1-2: Risk assessment methodology needed enhancement - <em>CLOSED</em></li><li>Finding P1-3: Stakeholder communication plan incomplete - <em>CLOSED</em></li></ul>' }
                            ]
                        },
                        {
                            key: 'corrective-actions', label: '4.2 Corrective Actions Taken', blocks: [
                                { id: 'b5-11', text: '<p>The organization has effectively addressed all Phase 1 findings:</p><p><strong>P1-1:</strong> Quality manual was completely revised and approved by management on January 5, 2026.</p><p><strong>P1-2:</strong> New risk assessment framework implemented using ISO 31000 methodology.</p><p><strong>P1-3:</strong> Comprehensive stakeholder communication plan developed and published.</p>' }
                            ]
                        },
                        {
                            key: 'effectiveness', label: '4.3 Effectiveness Evaluation', blocks: [
                                { id: 'b5-12', text: '<p>All corrective actions have been implemented effectively. Evidence reviewed during this Phase 2 audit confirms that:</p><ul><li>Updated documentation is in active use</li><li>Staff are trained on new procedures</li><li>Management commitment is demonstrated through regular reviews</li></ul><p><strong>Overall Effectiveness Rating:</strong> Satisfactory</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'standards-report',
                    label: '5. Report per Standard',
                    expanded: true,
                    children: [
                        {
                            key: 'employership', label: '5.1 Employership', blocks: [
                                { id: 'b5-13', text: '<p><strong>Maturity Level:</strong> Managed (Level 3)</p><p><strong>Assessment:</strong> The organization demonstrates good employment practices with clear HR policies, fair compensation structures, and employee development programs. Work-life balance initiatives are in place.</p><p><strong>Observations:</strong> Employee satisfaction surveys show 78% positive ratings. Turnover rate is below industry average at 8.5%.</p>' }
                            ]
                        },
                        {
                            key: 'partnership', label: '5.2 Partnership', blocks: [
                                { id: 'b5-14', text: '<p><strong>Maturity Level:</strong> Managed (Level 3)</p><p><strong>Assessment:</strong> Strong supplier relationships with clear contracts and ethical sourcing criteria. Partnership agreements include social responsibility clauses.</p><p><strong>Observations:</strong> 85% of key suppliers have completed SRPM questionnaire. Annual supplier assessments are conducted.</p>' }
                            ]
                        },
                        {
                            key: 'neighbourhood', label: '5.3 Neighbourhood Relations', blocks: [
                                { id: 'b5-15', text: '<p><strong>Maturity Level:</strong> Defined (Level 2)</p><p><strong>Assessment:</strong> Basic community engagement programs exist. The organization participates in local initiatives and maintains good relations with neighboring businesses.</p><p><strong>Observations:</strong> Opportunity for improvement in structured community impact measurement.</p>' }
                            ]
                        },
                        {
                            key: 'sustainability', label: '5.4 Sustainability & Greening', blocks: [
                                { id: 'b5-16', text: '<p><strong>Maturity Level:</strong> Managed (Level 3)</p><p><strong>Assessment:</strong> Environmental management system is implemented with clear targets for waste reduction, energy efficiency, and carbon footprint reduction.</p><p><strong>Observations:</strong> 15% reduction in energy consumption achieved in 2025. Paperless office initiative is 80% complete.</p>' }
                            ]
                        },
                        {
                            key: 'communication', label: '5.5 Communication', blocks: [
                                { id: 'b5-17', text: '<p><strong>Maturity Level:</strong> Optimized (Level 4)</p><p><strong>Assessment:</strong> Excellent internal and external communication practices. Transparent reporting on social responsibility performance. Regular stakeholder engagement.</p><p><strong>Observations:</strong> Annual sustainability report published. Customer satisfaction communication rated highly.</p>' }
                            ]
                        },
                        {
                            key: 'credit-management', label: '5.6 Credit Management', blocks: [
                                { id: 'b5-18', text: '<p><strong>Maturity Level:</strong> Optimized (Level 4)</p><p><strong>Assessment:</strong> Ethical credit management practices are well-established. Clear policies for vulnerable customers, payment arrangements, and debt collection are implemented and monitored.</p><p><strong>Observations:</strong> Customer complaint resolution time averages 2.3 days. Debt settlement options are clearly communicated.</p>' }
                            ]
                        },
                        {
                            key: 'craftsmanship', label: '5.7 Craftsmanship', blocks: [
                                { id: 'b5-19', text: '<p><strong>Maturity Level:</strong> Managed (Level 3)</p><p><strong>Assessment:</strong> Professional competency is maintained through regular training and certification programs. Quality standards are defined and monitored.</p><p><strong>Observations:</strong> 95% of staff have completed required professional certifications. Continuous improvement culture is evident.</p>' }
                            ]
                        },
                        {
                            key: 'governance', label: '5.8 Good Governance', blocks: [
                                { id: 'b5-20', text: '<p><strong>Maturity Level:</strong> Managed (Level 3)</p><p><strong>Assessment:</strong> Clear governance structure with defined roles and responsibilities. Ethics policy is in place with reporting mechanisms for concerns.</p><p><strong>Observations:</strong> Board oversight of SRPM performance is documented. Regular management reviews are conducted.</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'key-figures',
                    label: '6. Key Figures',
                    children: [
                        {
                            key: 'performance-metrics', label: '6.1 Performance Metrics', blocks: [
                                { id: 'b5-21', text: '<p><strong>Key Performance Indicators (2025):</strong></p><ul><li>Customer Satisfaction Score: 4.2/5.0</li><li>Employee Engagement Index: 78%</li><li>Supplier Compliance Rate: 92%</li><li>Environmental Targets Met: 85%</li><li>Training Hours per Employee: 24 hours</li><li>Community Investment: €45,000</li></ul>' }
                            ]
                        },
                        {
                            key: 'trend-analysis', label: '6.2 Trend Analysis', blocks: [
                                { id: 'b5-22', text: '<p><strong>Year-over-Year Improvements:</strong></p><ul><li>Customer complaints reduced by 12%</li><li>Employee retention improved by 5%</li><li>Carbon emissions reduced by 18%</li><li>Supplier audit scores improved by 8%</li></ul><p>Overall positive trend observed across all SRPM dimensions.</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'auditor-advice',
                    label: '7. Auditor\'s Advice',
                    children: [
                        {
                            key: 'recommendations', label: '7.1 Recommendations', blocks: [
                                { id: 'b5-23', text: '<p><strong>Key Recommendations:</strong></p><ol><li>Enhance community impact measurement and reporting mechanisms</li><li>Complete documentation for vulnerable customer procedures (B-finding)</li><li>Consider SRPM Level 4 certification pathway for high-performing areas</li><li>Implement quarterly self-assessment program to maintain compliance</li></ol>' }
                            ]
                        },
                        {
                            key: 'certification-decision', label: '7.2 Certification Decision', blocks: [
                                { id: 'b5-24', text: '<p><strong>RECOMMENDATION: GRANT SRPM CERTIFICATION</strong></p><p>Based on the findings of this Phase 2 audit, the auditor recommends granting SRPM certification to Sample Corporation B.V.</p><p><strong>Conditions:</strong></p><ul><li>Two minor deviations (B-findings) to be addressed within 90 days</li><li>Evidence of corrective actions to be submitted by April 20, 2026</li></ul><p><strong>Certification Valid:</strong> 3 years from date of issue, subject to annual surveillance audits.</p>' }
                            ]
                        }
                    ]
                },
                {
                    key: 'signature',
                    label: '8. Signature',
                    children: [
                        {
                            key: 'auditor-signature', label: '8.1 Auditor Signature', blocks: [
                                { id: 'b5-25', text: '<p><strong>Lead Auditor:</strong> Maria Johnson</p><p><strong>Date:</strong> January 22, 2026</p><p><strong>Auditor ID:</strong> SRPM-AUD-2024-0892</p><p><em>This audit was conducted in accordance with the SRPM Audit Protocol v4.0 and represents a fair assessment of the organization\'s compliance with SRPM requirements.</em></p>' }
                            ]
                        },
                        {
                            key: 'organization-signature', label: '8.2 Organization Signature', blocks: [
                                { id: 'b5-26', text: '<p><strong>Organization Representative:</strong> [Pending Signature]</p><p><strong>Position:</strong> Managing Director</p><p><strong>Date:</strong> [Pending]</p><p><em>By signing, the organization acknowledges receipt of this audit report and commits to addressing the identified findings within the specified timeframes.</em></p>' }
                            ]
                        }
                    ]
                }
            ],
            referenceDocs: [
                { id: '10', title: 'SRPM Standards Framework', type: 'pdf', description: 'Social Responsible Process Management certification standards.' },
                { id: '11', title: 'Previous Audit Report', type: 'pdf', description: 'Last audit report for reference.' },
                { id: '12', title: 'Maturity Assessment Guide', type: 'doc', description: 'Guidelines for maturity level evaluation.' }
            ]
        }
    ];

    constructor() { }

    getAllReports(): Observable<Report[]> {
        return of(this.reports);
    }

    getReportById(id: string): Observable<Report | undefined> {
        const report = this.reports.find(r => r.id === id);
        return of(report);
    }

    updateReport(id: string, updates: Partial<Report>): Observable<Report | undefined> {
        const index = this.reports.findIndex(r => r.id === id);
        if (index !== -1) {
            this.reports[index] = { ...this.reports[index], ...updates };
            return of(this.reports[index]);
        }
        return of(undefined);
    }

    deleteReport(id: string): Observable<boolean> {
        const index = this.reports.findIndex(r => r.id === id);
        if (index !== -1) {
            this.reports.splice(index, 1);
            return of(true);
        }
        return of(false);
    }

    createReport(report: Report): Observable<Report> {
        this.reports.unshift(report);
        return of(report);
    }
}
