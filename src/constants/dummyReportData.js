export const DUMMY_REPORT_DATA = {
  "document": {
    "metadata": {
      "document_id": "DOC-2026-0001",
      "title": "Agentic AI KT Risk Moderator Agent – Technical Design",
      "subtitle": "Technical Design",
      "version": "Draft V1.0",
      "organization": "PwC",
      "client": "ABC Corporation",
      "classification": "Confidential",
      "prepared_by": "AgentForge AI",
      "date": "April 2026"
    },

    "table_of_contents": [
      {
        "id": "sec_1",
        "number": "1",
        "title": "Executive Summary",
        "level": 1,
        "page": 4
      },
      {
        "id": "sec_2",
        "number": "2",
        "title": "Solution Overview & Design Principles",
        "level": 1,
        "page": 5,

        "children": [
          {
            "id": "sec_2_1",
            "number": "2.1",
            "title": "Design Principles Aligned to Best Practices",
            "level": 2,
            "page": 5
          },
          {
            "id": "sec_2_2",
            "number": "2.2",
            "title": "Agent Category Classification",
            "level": 2,
            "page": 5
          }
        ]
      },
      {
        "id": "sec_3",
        "number": "3",
        "title": "Core Architecture Design",
        "level": 1,
        "page": 6,

        "children": [
          {
            "id": "sec_3_1",
            "number": "3.1",
            "title": "High-Level Architecture Layers",
            "level": 2,
            "page": 6
          },
          {
            "id": "sec_3_2",
            "number": "3.2",
            "title": "Presentation Layer",
            "level": 2,
            "page": 6,

            "children": [
              {
                "id": "sec_3_2_1",
                "number": "3.2.1",
                "title": "Core UI Components",
                "level": 3,
                "page": 6
              },
              {
                "id": "sec_3_2_2",
                "number": "3.2.2",
                "title": "Front End Tech Stack",
                "level": 3,
                "page": 7
              }
            ]
          },
          {
            "id": "sec_3_3",
            "number": "3.3",
            "title": "API Gateway & Orchestration Layer",
            "level": 2,
            "page": 7,

            "children": [
              {
                "id": "sec_3_3_1",
                "number": "3.3.1",
                "title": "API Gateway",
                "level": 3,
                "page": 7
              },
              {
                "id": "sec_3_3_2",
                "number": "3.3.2",
                "title": "Back End Application Server",
                "level": 3,
                "page": 8
              }
            ]
          },
          {
            "id": "sec_3_4",
            "number": "3.4",
            "title": "Layer 3 Agentic Core",
            "level": 2,
            "page": 8,

            "children": [
              {
                "id": "sec_3_4_1",
                "number": "3.4.1",
                "title": "Orchestrator Pattern",
                "level": 3,
                "page": 8
              },
              {
                "id": "sec_3_4_2",
                "number": "3.4.2",
                "title": "Agent 1 Orchestrator",
                "level": 3,
                "page": 9
              },
              {
                "id": "sec_3_4_3",
                "number": "3.4.3",
                "title": "Document Intake Agent",
                "level": 3,
                "page": 9
              },
              {
                "id": "sec_3_4_4",
                "number": "3.4.4",
                "title": "Knowledge Base Builder Agent",
                "level": 3,
                "page": 10
              },
              {
                "id": "sec_3_4_5",
                "number": "3.4.5",
                "title": "Risk Analysis Agent",
                "level": 3,
                "page": 10
              },
              {
                "id": "sec_3_4_6",
                "number": "3.4.6",
                "title": "Report Generator Agent",
                "level": 3,
                "page": 11
              },
              {
                "id": "sec_3_4_7",
                "number": "3.4.7",
                "title": "Chat Bot Agent",
                "level": 3,
                "page": 12
              }
            ]
          }
        ]
      }
    ],

    "sections": [
      {
        "id": "sec_1",
        "number": "1",
        "title": "Executive Summary",
        "level": 1,

        "content": [
          {
            "type": "paragraph",
            "text": "This document presents a detailed technical architecture for an Agentic AI application designed to assist enterprise teams during the Knowledge Transfer phase."
          },

          {
            "type": "paragraph",
            "text": "The application proactively identifies risks, pain points, SLA threats, and operational failures before SLA agreements are finalized."
          }
        ]
      },

      {
        "id": "sec_2",
        "number": "2",
        "title": "Solution Overview & Design Principles",
        "level": 1,

        "children": [
          {
            "id": "sec_2_1",
            "number": "2.1",
            "title": "Design Principles Aligned to Best Practices",
            "level": 2,

            "content": [
              {
                "type": "table",

                "title": "Design Principles",

                "headers": [
                  "#",
                  "Principle",
                  "Application to KT Assist"
                ],

                "rows": [
                  {
                    "columns": [
                      "1",
                      "Context is King",
                      "Context engineering across KT documents, ticket logs, and process knowledge."
                    ]
                  },
                  {
                    "columns": [
                      "2",
                      "System Prompts are Architecture",
                      "Production-grade prompts with role definitions and safety guardrails."
                    ]
                  },
                  {
                    "columns": [
                      "3",
                      "Agent Loop as Control System",
                      "Observe → Reason → Plan → Act → Evaluate → Update Memory."
                    ]
                  },
                  {
                    "columns": [
                      "4",
                      "Plan-and-Execute",
                      "Structured workflow execution."
                    ]
                  }
                ]
              }
            ]
          },

          {
            "id": "sec_2_2",
            "number": "2.2",
            "title": "Agent Category Classification",
            "level": 2,

            "content": [
              {
                "type": "bullet_list",

                "items": [
                  "Advisory Agent",
                  "Conversational Agent",
                  "Workflow Intelligence Agent"
                ]
              }
            ]
          }
        ]
      },

      {
        "id": "sec_3",
        "number": "3",
        "title": "Core Architecture Design",
        "level": 1,

        "children": [
          {
            "id": "sec_3_1",
            "number": "3.1",
            "title": "High-Level Architecture Layers",
            "level": 2,

            "content": [
              {
                "type": "image",

                "title": "Six Layer Architecture",

                "image": {
                  "url": "architecture.png",
                  "width": 500,
                  "height": 260
                },

                "caption": "Fig. 1 – Six Layer Architecture"
              }
            ]
          },

          {
            "id": "sec_3_2",
            "number": "3.2",
            "title": "Presentation Layer",
            "level": 2,

            "children": [
              {
                "id": "sec_3_2_1",
                "number": "3.2.1",
                "title": "Core UI Components",
                "level": 3,

                "content": [
                  {
                    "type": "table",

                    "title": "Core UI Components",

                    "headers": [
                      "Component",
                      "Description",
                      "Details"
                    ],

                    "rows": [
                      {
                        "columns": [
                          "Application Selector Panel",
                          "Dropdown interface",
                          "SAP, Infra, ServiceNow"
                        ],

                        "sub_rows": [
                          {
                            "label": "Dropdown 1",
                            "value": "Application Type"
                          },
                          {
                            "label": "Dropdown 2",
                            "value": "Specific Application Instance"
                          }
                        ]
                      },

                      {
                        "columns": [
                          "Document Upload Module",
                          "Multi-modal upload",
                          "PDF, DOCX, XLSX, CSV"
                        ],

                        "sub_rows": [
                          {
                            "label": "Features",
                            "value": [
                              "Drag-and-drop",
                              "Validation",
                              "Progress tracking"
                            ]
                          },

                          {
                            "label": "Connectors",
                            "value": [
                              "ServiceNow",
                              "SharePoint",
                              "Confluence"
                            ]
                          }
                        ]
                      },

                      {
                        "columns": [
                          "Report Generation Dashboard",
                          "One-click report generation",
                          "Real-time workflow tracking"
                        ],

                        "sub_rows": [
                          {
                            "label": "Stages",
                            "value": [
                              "Ingesting",
                              "Analyzing",
                              "Risk Extraction",
                              "Formatting"
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },

              {
                "id": "sec_3_2_2",
                "number": "3.2.2",
                "title": "Front End Tech Stack",
                "level": 3,

                "content": [
                  {
                    "type": "tech_stack",

                    "items": [
                      {
                        "category": "Framework",
                        "value": "React JS + TypeScript"
                      },
                      {
                        "category": "State Management",
                        "value": "Redux Toolkit"
                      },
                      {
                        "category": "Styling",
                        "value": "Tailwind CSS"
                      },
                      {
                        "category": "API",
                        "value": "Axios / React Query"
                      },
                      {
                        "category": "Streaming",
                        "value": "WebSockets"
                      }
                    ]
                  }
                ]
              }
            ]
          },

          {
            "id": "sec_3_3",
            "number": "3.3",
            "title": "API Gateway & Orchestration Layer",
            "level": 2,

            "children": [
              {
                "id": "sec_3_3_1",
                "number": "3.3.1",
                "title": "API Gateway",
                "level": 3,

                "content": [
                  {
                    "type": "table",

                    "title": "API Gateway Components",

                    "headers": [
                      "Component",
                      "Contents / Responsibility"
                    ],

                    "rows": [
                      {
                        "columns": [
                          "API Gateway",
                          "Authentication, routing, logging"
                        ],

                        "sub_rows": [
                          {
                            "label": "Security",
                            "value": [
                              "OAuth2",
                              "JWT",
                              "Rate limiting"
                            ]
                          },

                          {
                            "label": "Infrastructure",
                            "value": [
                              "Kong",
                              "AWS API Gateway"
                            ]
                          }
                        ]
                      },

                      {
                        "columns": [
                          "Session Manager",
                          "Session tracking"
                        ],

                        "sub_rows": [
                          {
                            "label": "Tracks",
                            "value": [
                              "User ID",
                              "Session ID",
                              "Conversation history"
                            ]
                          }
                        ]
                      },

                      {
                        "columns": [
                          "Request Router",
                          "Workflow routing"
                        ],

                        "sub_rows": [
                          {
                            "label": "Routes",
                            "value": [
                              "Chatbot Pipeline",
                              "Report Pipeline"
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },

          {
            "id": "sec_3_4",
            "number": "3.4",
            "title": "Layer 3 Agentic Core",
            "level": 2,

            "children": [
              {
                "id": "sec_3_4_1",
                "number": "3.4.1",
                "title": "Orchestrator Agent",
                "level": 3,

                "content": [
                  {
                    "type": "agent_specification",

                    "agent": {
                      "name": "Orchestrator Agent",
                      "role": "Central coordinator",
                      "framework": "Plan-and-Execute",
                      "model": "GPT-4o"
                    },

                    "responsibilities": [
                      "Task decomposition",
                      "Workflow routing",
                      "Error handling",
                      "Context isolation"
                    ],

                    "termination_conditions": [
                      "Max iterations",
                      "Task complete signal",
                      "Timeout"
                    ]
                  }
                ]
              },

              {
                "id": "sec_3_4_2",
                "number": "3.4.2",
                "title": "Risk Analysis Agent",
                "level": 3,

                "content": [
                  {
                    "type": "risk_dimensions",

                    "dimensions": [
                      {
                        "name": "KT Coverage Gaps",
                        "description": "Missing operational documentation"
                      },
                      {
                        "name": "Historical Pain Points",
                        "description": "Recurring issue patterns"
                      },
                      {
                        "name": "SLA Risk Flags",
                        "description": "Potential SLA breaches"
                      },
                      {
                        "name": "Dependency Risks",
                        "description": "Single-point failure areas"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      {
        "id": "sec_4",
        "number": "4",
        "title": "RAG and Knowledge Systems",
        "level": 1,

        "children": [
          {
            "id": "sec_4_1",
            "number": "4.1",
            "title": "Advanced RAG Pipeline",
            "level": 2,

            "content": [
              {
                "type": "table",

                "title": "Advanced RAG Pipeline Architecture",

                "headers": [
                  "Stage",
                  "Component",
                  "Details"
                ],

                "rows": [
                  {
                    "columns": [
                      "1. Query Analysis",
                      "Intent Detector",
                      "Classifies risk lookup and SLA queries"
                    ]
                  },

                  {
                    "columns": [
                      "2. Hybrid Retrieval",
                      "Dense + Sparse",
                      "Vector similarity + BM25"
                    ]
                  },

                  {
                    "columns": [
                      "3. Re-Ranking",
                      "Cross Encoder",
                      "Semantic relevance scoring"
                    ]
                  },

                  {
                    "columns": [
                      "4. GraphRAG",
                      "Knowledge Traversal",
                      "Relational reasoning"
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      {
        "id": "sec_5",
        "number": "5",
        "title": "Word Report Generation",
        "level": 1,

        "content": [
          {
            "type": "table",

            "title": "Report Structure Template",

            "headers": [
              "Section",
              "Contents"
            ],

            "rows": [
              {
                "columns": [
                  "Cover Page",
                  "Title, branding, classification"
                ]
              },

              {
                "columns": [
                  "Executive Summary",
                  "Risk overview and findings"
                ]
              },

              {
                "columns": [
                  "Risk Register",
                  "Severity-based risks"
                ]
              },

              {
                "columns": [
                  "Application Findings",
                  "Application-specific analysis"
                ]
              },

              {
                "columns": [
                  "Recommendations",
                  "Prioritized action items"
                ]
              }
            ]
          }
        ]
      }
    ]
  }
};
