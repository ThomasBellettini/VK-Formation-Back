import User, { IUser } from "../model/User.js";
import Planet, { IPlanet } from "../model/learning/Planet.js";
import { Request } from "express";

interface IUserPlanetResponse {
  statusCode: number;
  message: string;
  data?: any;
}

class UserPlanetService {
  constructor() {
    this.getUserFinishedPlanets = this.getUserFinishedPlanets.bind(this);
    this.getUserPlanetProgress = this.getUserPlanetProgress.bind(this);
  }

  async getUserFinishedPlanets(req: Request): Promise<IUserPlanetResponse> {
    try {
      // @ts-ignore
      const user = req.user as IUser;
      const databaseUser = await User.findById(user._id)
        .populate('planetsFinished', 'name description url level')
        .lean();

      if (!databaseUser) {
        return {
          statusCode: 404,
          message: "User not found"
        };
      }

      return {
        statusCode: 200,
        message: "User finished planets retrieved successfully",
        data: databaseUser.planetsFinished
      };
    } catch (error) {
      console.error("Error getting user finished planets:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }

  async getUserPlanetProgress(req: Request, planetId: string): Promise<IUserPlanetResponse> {
    try {
      // @ts-ignore
      const user = req.user as IUser;
      const databaseUser = await User.findById(user._id)
        .populate('lessonsFinished', 'name description url')
        .populate('holyProjects.project', 'name description url')
        .lean();

      if (!databaseUser) {
        return {
          statusCode: 404,
          message: "User not found"
        };
      }

      const planet = await Planet.findById(planetId)
        .populate('courses', 'name description url')
        .populate('projects', 'name description url')
        .lean();

      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found"
        };
      }

      // Check if user has finished this planet
      const isPlanetFinished = databaseUser.planetsFinished.some(
        (finishedPlanet: any) => finishedPlanet._id.toString() === planetId
      );

      // Calculate course completion
      const planetCourses = planet.courses;
      let coursesCompleted = 0;
      let totalCourses = 0;

      if (planetCourses) {
        const userFinishedLessons = new Set(databaseUser.lessonsFinished.map((lesson: any) => lesson._id.toString()));
        const planetCourseIds = Array.isArray(planetCourses) 
          ? planetCourses.map(course => course._id.toString())
          : [planetCourses._id.toString()];

        totalCourses = planetCourseIds.length;
        coursesCompleted = planetCourseIds.filter(courseId => 
          userFinishedLessons.has(courseId)
        ).length;
      }

      // Calculate project completion
      const planetProject = planet.projects;
      let projectCompleted = false;
      let projectScore = 0;

      if (planetProject) {
        const projectId = Array.isArray(planetProject) 
          ? planetProject[0]._id.toString() 
          : planetProject._id.toString();

        const userProject = databaseUser.holyProjects.find((hp: any) => 
          hp.project._id.toString() === projectId
        );

        if (userProject) {
          projectCompleted = userProject.resultPercent >= 80;
          projectScore = userProject.resultPercent;
        }
      }

      const progress = {
        planetId: planet._id,
        planetName: planet.name,
        isFinished: isPlanetFinished,
        courses: {
          completed: coursesCompleted,
          total: totalCourses,
          percentage: totalCourses > 0 ? Math.round((coursesCompleted / totalCourses) * 100) : 0
        },
        project: {
          completed: projectCompleted,
          score: projectScore,
          requiredScore: 80
        }
      };

      return {
        statusCode: 200,
        message: "User planet progress retrieved successfully",
        data: progress
      };
    } catch (error) {
      console.error("Error getting user planet progress:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }
}

export default UserPlanetService; 