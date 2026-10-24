import mockData from "../data/mockData.json";
import type { Course, CourseLevel } from "../types/course";

const courses = mockData.courses as Course[];

export interface CourseRepository {
  findCourse(courseId: string): Promise<Course | undefined>;
  findLevel(courseId: string, levelId: string): Promise<{ course: Course; level: CourseLevel } | undefined>;
}

export class MockCourseRepository implements CourseRepository {
  async findCourse(courseId: string) {
    return courses.find((course) => course.id === courseId);
  }

  async findLevel(courseId: string, levelId: string) {
    const course = await this.findCourse(courseId);
    const level = course?.levels.find((item) => item.id === levelId);
    return course && level ? { course, level } : undefined;
  }
}
