// Fixed IDs matching the dev seed data in supabase/migrations/001_initial_schema.sql.
// Used by both the LTI dev bypass and the demo login to reference the same mock instructor/course.
import type { UserId, RegistrationId, CourseId } from '@/types/domain'

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002' as UserId
export const DEMO_REGISTRATION_ID = '00000000-0000-0000-0000-000000000001' as RegistrationId
export const DEMO_COURSE_ID = '00000000-0000-0000-0000-000000000003' as CourseId
export const DEMO_DEPLOYMENT_ID = 'demo-deployment'
