export interface ArchitectureMap {
  frontend: FrontendMap;
  backend: BackendMap;
  infrastructure: InfraMap;
}

export interface FrontendMap {
  rootPath: string;
  srcPath: string;
  pagesLegacy: string;
  pagesNew: string;
  components: string;
  apiServices: string;
  router: string;
  framework: string;
  testFramework: string;
  keyFiles: Record<string, string>;
}

export interface BackendMap {
  rootPath: string;
  srcMain: string;
  srcTest: string;
  basePackage: string;
  packages: Record<string, string>;
  migrationsPath: string;
  framework: string;
  testFramework: string;
  keyFiles: Record<string, string>;
}

export interface InfraMap {
  kubernetes: string;
  helm: string;
  terraform: string;
  cicd: string;
  docker: string;
  caddy: string;
}

export const TXDNA_ARCHITECTURE: ArchitectureMap = {
  frontend: {
    rootPath: 'frontend',
    srcPath: 'frontend/src',
    pagesLegacy: 'frontend/src/pages',
    pagesNew: 'frontend/src/pages-new',
    components: 'frontend/src/components',
    apiServices: 'frontend/src/api',
    router: 'frontend/src/App.tsx',
    framework: 'React 19.x + TypeScript 6 + Vite + Tailwind CSS 3',
    testFramework: 'Vitest',
    keyFiles: {
      'App.tsx': 'frontend/src/App.tsx',
      'UIRouter.tsx': 'frontend/src/UIRouter.tsx',
      'main.tsx': 'frontend/src/main.tsx',
    },
  },
  backend: {
    rootPath: 'backend',
    srcMain: 'backend/src/main/java/com/txdna',
    srcTest: 'backend/src/test/java/com/txdna',
    basePackage: 'com.txdna',
    packages: {
      controller: 'backend/src/main/java/com/txdna/controller',
      service: 'backend/src/main/java/com/txdna/service',
      domain: 'backend/src/main/java/com/txdna/domain',
      dto: 'backend/src/main/java/com/txdna/dto',
      repository: 'backend/src/main/java/com/txdna/repository',
      security: 'backend/src/main/java/com/txdna/security',
      util: 'backend/src/main/java/com/txdna/util',
      graphify: 'backend/src/main/java/com/txdna/graphify',
    },
    migrationsPath: 'backend/src/main/resources/db/migration',
    framework: 'Spring Boot 3.2.5 + Java 17 + JPA/Hibernate + Flyway',
    testFramework: 'JUnit 5 + Spring Test',
    keyFiles: {
      'GlobalExceptionHandler': 'backend/src/main/java/com/txdna/util/GlobalExceptionHandler.java',
      'TenantContext': 'backend/src/main/java/com/txdna/util/TenantContext.java',
      'JwtAuthFilter': 'backend/src/main/java/com/txdna/security/JwtAuthFilter.java',
      'DomainExecutionRouter': 'backend/src/main/java/com/txdna/service/DomainExecutionRouter.java',
    },
  },
  infrastructure: {
    kubernetes: 'infra/k8s',
    helm: 'helm',
    terraform: 'infra',
    cicd: '.github/workflows',
    docker: 'backend/Dockerfile',
    caddy: 'caddy/Caddyfile',
  },
};

export function getArchitectureContext(): string {
  const map = TXDNA_ARCHITECTURE;
  return `
## TransactionDNA Architecture Map

### Frontend
- Root: ${map.frontend.rootPath}
- New Pages (canonical): ${map.frontend.pagesNew}
- Legacy Pages (do not import from here in pages-new): ${map.frontend.pagesLegacy}
- Components: ${map.frontend.components}
- Framework: ${map.frontend.framework}
- Tests: ${map.frontend.testFramework}

### Backend
- Base Package: ${map.backend.basePackage}
- Key Packages: ${Object.entries(map.backend.packages).map(([k, v]) => `\n  - ${k}: ${v}`).join('')}
- Migrations: ${map.backend.migrationsPath}
- Framework: ${map.backend.framework}

### Key Files
- TenantContext: ${map.backend.keyFiles['TenantContext']}
- GlobalExceptionHandler: ${map.backend.keyFiles['GlobalExceptionHandler']}
- JwtAuthFilter: ${map.backend.keyFiles['JwtAuthFilter']}
- DomainExecutionRouter: ${map.backend.keyFiles['DomainExecutionRouter']}

### Infrastructure
- Kubernetes: ${map.infrastructure.kubernetes}
- Helm: ${map.infrastructure.helm}
- CI/CD: ${map.infrastructure.cicd}
`.trim();
}
