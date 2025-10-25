import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CarritoService } from '../services/carrito.service';
import { Carrito } from '../entities/carrito.entity';
import { CreateCarritoDto } from '../dto/create-carrito.dto';
import { UpdateCarritoDto } from '../dto/update-carrito.dto';
import { AddToCartAIDto } from '../dto/add-to-cart-ai.dto';
import { ProductosService } from '../services/productos.service';
import { UsuariosService } from '../services/usuarios.service';

describe('CarritoService', () => {
  let service: CarritoService;
  let repository: Repository<Carrito>;
  let productosService: ProductosService;
  let usuariosService: UsuariosService;

  // Mocks de datos
  const mockUsuario = {
    id: 1,
    nombreUsuario: 'testuser',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
  };

  const mockProducto = {
    id: 1,
    nombre: 'Laptop HP',
    descripcion: 'Laptop HP Pavilion',
    precio: 799.99,
    stock: 10,
    imagenUrl: '1abc123',
    fechaCreacion: new Date(),
  };

  const mockProducto2 = {
    id: 2,
    nombre: 'Mouse Logitech',
    descripcion: 'Mouse inalámbrico',
    precio: 89.99,
    stock: 50,
    imagenUrl: '2def456',
    fechaCreacion: new Date(),
  };

  const mockCarritoItem: Carrito = {
    id: 1,
    usuarioId: 1,
    productoId: 1,
    cantidad: 2,
    fechaAgregado: new Date('2024-01-01'),
    usuario: mockUsuario as any,
    producto: mockProducto as any,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockProductosService = {
    findOne: jest.fn(),
    findByName: jest.fn(),
    searchProducts: jest.fn(),
    getAvailableProducts: jest.fn(),
  };

  const mockUsuariosService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarritoService,
        {
          provide: getRepositoryToken(Carrito),
          useValue: mockRepository,
        },
        {
          provide: ProductosService,
          useValue: mockProductosService,
        },
        {
          provide: UsuariosService,
          useValue: mockUsuariosService,
        },
      ],
    }).compile();

    service = module.get<CarritoService>(CarritoService);
    repository = module.get<Repository<Carrito>>(getRepositoryToken(Carrito));
    productosService = module.get<ProductosService>(ProductosService);
    usuariosService = module.get<UsuariosService>(UsuariosService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addItem', () => {
    const createDto: CreateCarritoDto = {
      usuarioId: 1,
      productoId: 1,
      cantidad: 2,
    };

    it('debería agregar un nuevo item al carrito', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findOne.mockResolvedValue(mockProducto);
      mockRepository.findOne.mockResolvedValue(null); // No existe en carrito
      mockRepository.create.mockReturnValue(mockCarritoItem);
      mockRepository.save.mockResolvedValue(mockCarritoItem);

      // Act
      const result = await service.addItem(createDto);

      // Assert
      expect(usuariosService.findOne).toHaveBeenCalledWith(1);
      expect(productosService.findOne).toHaveBeenCalledWith(1);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { usuarioId: 1, productoId: 1 },
        relations: ['producto'],
      });
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockCarritoItem);
      expect(result).toEqual(mockCarritoItem);
    });

    it('debería actualizar cantidad si el producto ya existe en el carrito', async () => {
      // Arrange
      const existingItem = { ...mockCarritoItem, cantidad: 1 };
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findOne.mockResolvedValue(mockProducto);
      mockRepository.findOne
        .mockResolvedValueOnce(existingItem) // Primera llamada: item existente
        .mockResolvedValueOnce({ ...existingItem, cantidad: 3 }); // Segunda: después de update
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.addItem(createDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith(1, { cantidad: 3 });
    });

    it('debería lanzar BadRequestException si no hay suficiente stock', async () => {
      // Arrange
      const productoSinStock = { ...mockProducto, stock: 1 };
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findOne.mockResolvedValue(productoSinStock);

      // Act & Assert
      await expect(service.addItem(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.addItem(createDto)).rejects.toThrow(
        'Stock insuficiente. Disponible: 1, solicitado: 2',
      );
    });

    it('debería lanzar BadRequestException si la cantidad total excede el stock', async () => {
      // Arrange
      const existingItem = { ...mockCarritoItem, cantidad: 8 };
      const productoLimitado = { ...mockProducto, stock: 9 };
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findOne.mockResolvedValue(productoLimitado);
      mockRepository.findOne.mockResolvedValue(existingItem);

      // Act & Assert
      await expect(service.addItem(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.addItem(createDto)).rejects.toThrow(
        'Stock insuficiente para la cantidad total',
      );
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockUsuariosService.findOne.mockRejectedValue(
        new NotFoundException('Usuario no encontrado'),
      );

      // Act & Assert
      await expect(service.addItem(createDto)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findOne.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );

      // Act & Assert
      await expect(service.addItem(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItemByAI', () => {
    const aiDto: AddToCartAIDto = {
      usuarioId: 1,
      productoNombre: 'Laptop HP',
      cantidad: 1,
    };

    it('debería agregar producto por nombre exitosamente', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findByName.mockResolvedValue(mockProducto);
      mockProductosService.findOne.mockResolvedValue(mockProducto);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCarritoItem);
      mockRepository.save.mockResolvedValue(mockCarritoItem);

      // Act
      const result = await service.addItemByAI(aiDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('agregado al carrito exitosamente');
      expect(result.data).toBeDefined();
    });

    it('debería buscar por similitud si no encuentra nombre exacto', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findByName.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );
      mockProductosService.searchProducts.mockResolvedValue([mockProducto]);
      mockProductosService.findOne.mockResolvedValue(mockProducto);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCarritoItem);
      mockRepository.save.mockResolvedValue(mockCarritoItem);

      // Act
      const result = await service.addItemByAI(aiDto);

      // Assert
      expect(productosService.searchProducts).toHaveBeenCalledWith('Laptop HP');
      expect(result.success).toBe(true);
    });

    it('debería retornar error si no encuentra ningún producto', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findByName.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );
      mockProductosService.searchProducts.mockResolvedValue([]);
      mockProductosService.getAvailableProducts.mockResolvedValue([
        mockProducto,
        mockProducto2,
      ]);

      // Act
      const result = await service.addItemByAI(aiDto);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('PRODUCTO_NO_ENCONTRADO');
      expect(result.message).toContain('No se encontró ningún producto');
    });

    it('debería retornar error si encuentra múltiples productos', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockProductosService.findByName.mockRejectedValue(
        new NotFoundException('Producto no encontrado'),
      );
      mockProductosService.searchProducts.mockResolvedValue([
        mockProducto,
        mockProducto2,
      ]);

      // Act
      const result = await service.addItemByAI(aiDto);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('MULTIPLES_PRODUCTOS');
      expect(result.message).toContain('múltiples productos similares');
      expect(result.data).toBeDefined();
    });

    it('debería manejar errores y retornar respuesta de error', async () => {
      // Arrange
      mockUsuariosService.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.addItemByAI(aiDto);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error al agregar producto');
    });
  });

  describe('getCarritoByUser', () => {
    it('debería devolver el carrito completo del usuario', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      const carritoItems = [mockCarritoItem, { ...mockCarritoItem, id: 2, cantidad: 1 }];
      mockQueryBuilder.getMany.mockResolvedValue(carritoItems);

      // Act
      const result = await service.getCarritoByUser(1);

      // Assert
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('carrito');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'carrito.producto',
        'producto',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'carrito.usuarioId = :usuarioId',
        { usuarioId: 1 },
      );
      expect(result.items).toHaveLength(2);
      expect(result.cantidadItems).toBe(2);
      expect(result.cantidadTotal).toBe(3); // 2 + 1
    });

    it('debería calcular el total correctamente', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([mockCarritoItem]);

      // Act
      const result = await service.getCarritoByUser(1);

      // Assert
      expect(result.total).toBe(1599.98); // 799.99 * 2
    });

    it('debería devolver carrito vacío si no hay items', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.getCarritoByUser(1);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.cantidadTotal).toBe(0);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockUsuariosService.findOne.mockRejectedValue(
        new NotFoundException('Usuario no encontrado'),
      );

      // Act & Assert
      await expect(service.getCarritoByUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateItem', () => {
    const updateDto: UpdateCarritoDto = {
      cantidad: 5,
    };

    it('debería actualizar la cantidad de un item', async () => {
      // Arrange
      mockRepository.findOne
        .mockResolvedValueOnce(mockCarritoItem)
        .mockResolvedValueOnce({ ...mockCarritoItem, cantidad: 5 });
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.updateItem(1, updateDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.cantidad).toBe(5);
    });

    it('debería lanzar NotFoundException si el item no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateItem(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateItem(999, updateDto)).rejects.toThrow(
        'Item del carrito con ID 999 no encontrado',
      );
    });

    it('debería lanzar BadRequestException si no hay suficiente stock', async () => {
      // Arrange
      const itemConProductoLimitado = {
        ...mockCarritoItem,
        producto: { ...mockProducto, stock: 3 },
      };
      mockRepository.findOne.mockResolvedValue(itemConProductoLimitado);

      // Act & Assert
      await expect(service.updateItem(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateItem(1, updateDto)).rejects.toThrow(
        'Stock insuficiente. Disponible: 3, solicitado: 5',
      );
    });
  });

  describe('removeItem', () => {
    it('debería eliminar un item del carrito', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCarritoItem);
      mockRepository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      // Act
      const result = await service.removeItem(1);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['producto'],
      });
      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(result.message).toContain('Laptop HP');
      expect(result.message).toContain('eliminado del carrito exitosamente');
    });

    it('debería lanzar NotFoundException si el item no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeItem(999)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar NotFoundException si no se pudo eliminar', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCarritoItem);
      mockRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      // Act & Assert
      await expect(service.removeItem(1)).rejects.toThrow(NotFoundException);
      await expect(service.removeItem(1)).rejects.toThrow(
        'No se pudo eliminar el item con ID 1',
      );
    });
  });

  describe('clearCarrito', () => {
    it('debería vaciar el carrito completamente', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockRepository.delete.mockResolvedValue({ affected: 3 } as DeleteResult);

      // Act
      const result = await service.clearCarrito(1);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith({ usuarioId: 1 });
      expect(result.message).toContain('3 items eliminados');
    });

    it('debería retornar mensaje si el carrito ya estaba vacío', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockRepository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      // Act
      const result = await service.clearCarrito(1);

      // Assert
      expect(result.message).toContain('ya estaba vacío');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockUsuariosService.findOne.mockRejectedValue(
        new NotFoundException('Usuario no encontrado'),
      );

      // Act & Assert
      await expect(service.clearCarrito(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCarritoSummary', () => {
    it('debería devolver resumen del carrito', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalItems: '2',
        cantidadTotal: '5',
        total: '1000.50',
      });

      // Act
      const result = await service.getCarritoSummary(1);

      // Assert
      expect(result).toEqual({
        totalItems: 2,
        cantidadTotal: 5,
        total: 1000.5,
      });
    });

    it('debería devolver valores en 0 para carrito vacío', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      // Act
      const result = await service.getCarritoSummary(1);

      // Assert
      expect(result).toEqual({
        totalItems: 0,
        cantidadTotal: 0,
        total: 0,
      });
    });
  });

  describe('getSugerenciasIA', () => {
    it('debería sugerir productos no incluidos en el carrito', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([mockCarritoItem]);
      mockProductosService.getAvailableProducts.mockResolvedValue([
        mockProducto,
        mockProducto2,
      ]);

      // Act
      const result = await service.getSugerenciasIA(1);

      // Assert
      expect(result.productos).toContain('Mouse Logitech');
      expect(result.productos).not.toContain('Laptop HP');
      expect(result.message).toContain('podrías estar interesado');
    });

    it('debería sugerir todos los productos si el carrito está vacío', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockProductosService.getAvailableProducts.mockResolvedValue([
        mockProducto,
        mockProducto2,
      ]);

      // Act
      const result = await service.getSugerenciasIA(1);

      // Assert
      expect(result.productos).toHaveLength(2);
      expect(result.message).toContain('carrito está vacío');
    });
  });

  describe('validarCarrito', () => {
    it('debería validar carrito sin errores', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([mockCarritoItem]);
      mockProductosService.findOne.mockResolvedValue(mockProducto);

      // Act
      const result = await service.validarCarrito(1);

      // Assert
      expect(result.valido).toBe(true);
      expect(result.errores).toHaveLength(0);
    });

    it('debería detectar items sin stock suficiente', async () => {
      // Arrange
      mockUsuariosService.findOne.mockResolvedValue(mockUsuario);
      mockQueryBuilder.getMany.mockResolvedValue([mockCarritoItem]);
      const productoSinStock = { ...mockProducto, stock: 1 };
      mockProductosService.findOne.mockResolvedValue(productoSinStock);

      // Act
      const result = await service.validarCarrito(1);

      // Assert
      expect(result.valido).toBe(false);
      expect(result.errores).toHaveLength(1);
      expect(result.errores[0]).toContain('Stock insuficiente');
    });
  });

  describe('findCarritoItem', () => {
    it('debería encontrar un item específico en el carrito', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockCarritoItem);

      // Act
      const result = await service.findCarritoItem(1, 1);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { usuarioId: 1, productoId: 1 },
        relations: ['producto', 'usuario'],
      });
      expect(result).toEqual(mockCarritoItem);
    });

    it('debería retornar null si no encuentra el item', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findCarritoItem(1, 999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getItemCount', () => {
    it('debería contar los items en el carrito', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(5);

      // Act
      const result = await service.getItemCount(1);

      // Assert
      expect(repository.count).toHaveBeenCalledWith({ where: { usuarioId: 1 } });
      expect(result).toBe(5);
    });

    it('debería retornar 0 para carrito vacío', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getItemCount(1);

      // Assert
      expect(result).toBe(0);
    });
  });
});