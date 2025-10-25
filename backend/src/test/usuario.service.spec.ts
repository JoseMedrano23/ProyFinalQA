import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../services/usuarios.service';
import { Usuario } from '../entities/usuario.entity';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock de bcrypt
jest.mock('bcrypt');

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repository: Repository<Usuario>;

  // Datos de prueba reutilizables
  const mockUsuario: Usuario = {
    id: 1,
    nombreUsuario: 'testuser',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    telefono: '12345678',
    direccion: 'Test Address 123',
    fechaRegistro: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-01'),
    activo: true,
    carrito: [],
  };

  const mockUsuarioSinPassword = {
    id: 1,
    nombreUsuario: 'testuser',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
    telefono: '12345678',
    direccion: 'Test Address 123',
    fechaRegistro: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-01'),
    activo: true,
    carrito: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    repository = module.get<Repository<Usuario>>(getRepositoryToken(Usuario));

    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUsuarioDto: CreateUsuarioDto = {
      nombreUsuario: 'newuser',
      contrasena: 'password123',
      email: 'NEW@EXAMPLE.COM', // Mayúsculas para probar normalización
      nombre: 'New',
      apellido: 'User',
      telefono: '87654321',
      direccion: 'New Address 456',
    };

    it('debería crear un usuario exitosamente', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null); // No existe usuario
      mockRepository.create.mockReturnValue(mockUsuario);
      mockRepository.save.mockResolvedValue(mockUsuario);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      // Act
      const result = await service.create(createUsuarioDto);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2); // Verificar email y username
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' }, // Email normalizado
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nombreUsuario: 'newuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockRepository.create).toHaveBeenCalledWith({
        nombreUsuario: 'newuser',
        nombre: 'New',
        apellido: 'User',
        email: 'new@example.com', // Email normalizado a minúsculas
        password: 'hashedPassword123',
        telefono: '87654321',
        direccion: 'New Address 456',
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('debería lanzar ConflictException si el email ya existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValueOnce(mockUsuario); // Email existe

      // Act & Assert
      await expect(service.create(createUsuarioDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUsuarioDto)).rejects.toThrow(
        'El email ya está registrado',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el nombre de usuario ya existe', async () => {
      // Arrange
      mockRepository.findOne
        .mockResolvedValueOnce(null) // Email no existe
        .mockResolvedValueOnce(mockUsuario); // Username existe

      // Act & Assert
      await expect(service.create(createUsuarioDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUsuarioDto)).rejects.toThrow(
        'El nombre de usuario ya está registrado',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debería normalizar el email a minúsculas', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUsuario);
      mockRepository.save.mockResolvedValue(mockUsuario);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      // Act
      await service.create(createUsuarioDto);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com', // Verificar que está en minúsculas
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      nombreUsuario: 'testuser',
      contrasena: 'password123',
    };

    it('debería hacer login exitosamente con nombre de usuario', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: [
          { email: 'testuser' },
          { nombreUsuario: 'testuser' },
        ],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(result).toEqual({
        usuario: mockUsuarioSinPassword,
        message: 'Login exitoso',
      });
      expect(result.usuario).not.toHaveProperty('password');
    });

    it('debería hacer login exitosamente con email', async () => {
      // Arrange
      const loginWithEmail: LoginDto = {
        nombreUsuario: 'test@example.com',
        contrasena: 'password123',
      };
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.login(loginWithEmail);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: [
          { email: 'test@example.com' },
          { nombreUsuario: 'test@example.com' },
        ],
      });
      expect(result.message).toBe('Login exitoso');
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Usuario o contraseña incorrectos',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Usuario o contraseña incorrectos',
      );
    });
  });

  describe('findAll', () => {
    it('debería devolver todos los usuarios sin contraseñas', async () => {
      // Arrange
      const usuarios = [mockUsuario, { ...mockUsuario, id: 2, email: 'test2@example.com' }];
      mockRepository.find.mockResolvedValue(usuarios);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { fechaRegistro: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
    });

    it('debería devolver un array vacío si no hay usuarios', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('debería devolver un usuario sin contraseña', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(1);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Usuario con ID 999 no encontrado',
      );
    });
  });

  describe('findByEmail', () => {
    it('debería encontrar un usuario por email', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);

      // Act
      const result = await service.findByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }, // Email normalizado
      });
      expect(result).toEqual(mockUsuario);
    });

    it('debería devolver null si no encuentra el usuario', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('noexiste@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('debería encontrar un usuario por nombre de usuario', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);

      // Act
      const result = await service.findByUsername('testuser');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nombreUsuario: 'testuser' },
      });
      expect(result).toEqual(mockUsuario);
    });

    it('debería devolver null si no encuentra el usuario', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByUsername('noexiste');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUsuarioDto: UpdateUsuarioDto = {
      nombre: 'Updated',
      apellido: 'Name',
      telefono: '99999999',
    };

    it('debería actualizar un usuario exitosamente', async () => {
      // Arrange
      mockRepository.findOne
        .mockResolvedValueOnce(mockUsuario) // Primera llamada: verificar que existe
        .mockResolvedValueOnce(mockUsuarioSinPassword); // Segunda llamada: en findOne
      mockRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.update(1, updateUsuarioDto);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        nombre: 'Updated',
        apellido: 'Name',
        telefono: '99999999',
      });
      expect(result).toEqual(mockUsuarioSinPassword);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, updateUsuarioDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ConflictException si el nuevo email ya existe', async () => {
      // Arrange
      const updateWithEmail: UpdateUsuarioDto = {
        email: 'existing@example.com',
      };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUsuario) // Usuario a actualizar existe
        .mockResolvedValueOnce({ ...mockUsuario, id: 2, email: 'existing@example.com' }); // Email ya existe

      // Mock del método findByEmail
      jest.spyOn(service, 'findByEmail').mockResolvedValue({ 
        ...mockUsuario, 
        id: 2, 
        email: 'existing@example.com' 
      });

      // Act & Assert
      await expect(service.update(1, updateWithEmail)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateWithEmail)).rejects.toThrow(
        'El email ya está en uso',
      );
    });

    it('debería lanzar ConflictException si el nuevo nombre de usuario ya existe', async () => {
      // Arrange
      const updateWithUsername: UpdateUsuarioDto = {
        nombreUsuario: 'existinguser',
      };
      mockRepository.findOne.mockResolvedValueOnce(mockUsuario);
      
      jest.spyOn(service, 'findByUsername').mockResolvedValue({ 
        ...mockUsuario, 
        id: 2, 
        nombreUsuario: 'existinguser' 
      });

      // Act & Assert
      await expect(service.update(1, updateWithUsername)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateWithUsername)).rejects.toThrow(
        'El nombre de usuario ya está en uso',
      );
    });

    it('debería hashear la contraseña si se actualiza', async () => {
      // Arrange
      const updateWithPassword: UpdateUsuarioDto = {
        contrasena: 'newPassword123',
      };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUsuario)
        .mockResolvedValueOnce(mockUsuarioSinPassword);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      // Act
      await service.update(1, updateWithPassword);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        password: 'newHashedPassword',
      });
    });

    it('debería permitir actualizar email si es el mismo usuario (case-insensitive)', async () => {
      // Arrange
      const updateWithSameEmail: UpdateUsuarioDto = {
        email: 'TEST@EXAMPLE.COM', // Mismo email, diferentes mayúsculas
      };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUsuario)
        .mockResolvedValueOnce(mockUsuarioSinPassword);

      // Act
      const result = await service.update(1, updateWithSameEmail);

      // Assert
      expect(mockRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('debería eliminar un usuario exitosamente', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.remove(1);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        message: 'Usuario "Test User" eliminado exitosamente',
      });
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('debería cambiar la contraseña exitosamente', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.changePassword(1, 'oldPassword', 'newPassword123');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'hashedPassword123');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        password: 'newHashedPassword',
      });
      expect(result).toEqual({
        message: 'Contraseña actualizada exitosamente',
      });
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(999, 'oldPassword', 'newPassword'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar UnauthorizedException si la contraseña actual es incorrecta', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(1, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(1, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow('Contraseña actual incorrecta');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserStats', () => {
    it('debería devolver estadísticas del usuario', async () => {
      // Arrange
      const mockDate = new Date('2024-06-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      mockRepository.findOne.mockResolvedValue(mockUsuario);

      // Act
      const result = await service.getUserStats(1);

      // Assert
      expect(result).toHaveProperty('usuario');
      expect(result).toHaveProperty('estadisticas');
      expect(result.usuario).not.toHaveProperty('password');
      expect(result.estadisticas).toHaveProperty('fechaRegistro');
      expect(result.estadisticas).toHaveProperty('diasRegistrado');
      expect(typeof result.estadisticas.diasRegistrado).toBe('number');
    });

    it('debería calcular correctamente los días registrado', async () => {
      // Arrange
      const fechaRegistro = new Date('2024-01-01');
      const fechaActual = new Date('2024-01-31');
      
      const usuarioConFecha = {
        ...mockUsuarioSinPassword,
        fechaRegistro,
      };

      mockRepository.findOne.mockResolvedValue({
        ...mockUsuario,
        fechaRegistro,
      });

      jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
        if (arg) return new Date(arg) as any;
        return fechaActual as any;
      });

      // Act
      const result = await service.getUserStats(1);

      // Assert
      expect(result.estadisticas.diasRegistrado).toBe(30); // 30 días de diferencia
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserStats(999)).rejects.toThrow(NotFoundException);
    });
  });
});