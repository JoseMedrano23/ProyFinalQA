import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductosService } from '../services/productos.service';
import { Producto } from '../entities/producto.entity';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { UpdateProductoDto } from '../dto/update-producto.dto';

// Mock de fetch global
global.fetch = jest.fn();

describe('ProductosService', () => {
  let service: ProductosService;
  let repository: Repository<Producto>;

  // Datos de prueba reutilizables basados en tu entidad real
  const mockProducto: Producto = {
    id: 1,
    nombre: 'Laptop HP',
    descripcion: 'Laptop HP Pavilion 15.6" Intel Core i5',
    precio: 799.99,
    stock: 15,
    imagenUrl: '1abc123xyz',
    fechaCreacion: new Date('2024-01-01'),
    carrito: [],
  };

  const mockProducto2: Producto = {
    id: 2,
    nombre: 'Mouse Logitech',
    descripcion: 'Mouse inalámbrico Logitech MX Master 3',
    precio: 89.99,
    stock: 50,
    imagenUrl: '2def456uvw',
    fechaCreacion: new Date('2024-01-02'),
    carrito: [],
  };

  const mockProductoSinStock: Producto = {
    id: 3,
    nombre: 'Teclado Mecánico',
    descripcion: 'Teclado mecánico RGB',
    precio: 129.99,
    stock: 0,
    imagenUrl: '3ghi789rst',
    fechaCreacion: new Date('2024-01-03'),
    carrito: [],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        {
          provide: getRepositoryToken(Producto),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
    repository = module.get<Repository<Producto>>(getRepositoryToken(Producto));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductoDto: CreateProductoDto = {
      nombre: 'Monitor Samsung',
      descripcion: 'Monitor Samsung 27" 4K',
      precio: 349.99,
      stock: 10,
      imagenUrl: 'monitor-samsung-4k',
    };

    it('debería crear un producto exitosamente', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockProducto);
      mockRepository.save.mockResolvedValue(mockProducto);

      // Act
      const result = await service.create(createProductoDto);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(createProductoDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProducto);
      expect(result).toEqual(mockProducto);
    });

    it('debería propagar errores del repositorio', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRepository.create.mockReturnValue(mockProducto);
      mockRepository.save.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(createProductoDto)).rejects.toThrow(error);
    });

    it('debería crear producto con stock por defecto si no se proporciona', async () => {
      // Arrange
      const dtoSinStock = { ...createProductoDto, stock: 0 };
      const productoConStockCero = { ...mockProducto, stock: 0 };
      mockRepository.create.mockReturnValue(productoConStockCero);
      mockRepository.save.mockResolvedValue(productoConStockCero);

      // Act
      const result = await service.create(dtoSinStock);

      // Assert
      expect(result.stock).toBe(0);
    });
  });

  describe('findAll', () => {
    it('debería devolver todos los productos ordenados por fecha de creación DESC', async () => {
      // Arrange
      const productos = [mockProducto, mockProducto2, mockProductoSinStock];
      mockRepository.find.mockResolvedValue(productos);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { fechaCreacion: 'DESC' },
      });
      expect(result).toEqual(productos);
      expect(result).toHaveLength(3);
    });

    it('debería devolver un array vacío si no hay productos', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('debería devolver un producto por ID', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockProducto);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Producto con ID 999 no encontrado',
      );
    });
  });

  describe('findByName', () => {
    it('debería encontrar un producto por nombre exacto', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);

      // Act
      const result = await service.findByName('Laptop HP');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nombre: 'Laptop HP' },
      });
      expect(result).toEqual(mockProducto);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByName('Producto Inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchProducts', () => {
    it('debería buscar productos por nombre usando LIKE', async () => {
      // Arrange
      const searchQuery = 'Laptop';
      const productos = [mockProducto];
      mockQueryBuilder.getMany.mockResolvedValue(productos);

      // Act
      const result = await service.searchProducts(searchQuery);

      // Assert
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('producto');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'producto.nombre LIKE :query',
        { query: '%Laptop%' },
      );
      expect(result).toEqual(productos);
    });

    it('debería devolver array vacío si la query tiene menos de 2 caracteres', async () => {
      // Act
      const result = await service.searchProducts('L');

      // Assert
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debería devolver array vacío si la query está vacía', async () => {
      // Act
      const result = await service.searchProducts('');

      // Assert
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debería devolver array vacío si la query es null', async () => {
      // Act
      const result = await service.searchProducts(" ");

      // Assert
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableProducts', () => {
    it('debería devolver solo productos con stock mayor a 0', async () => {
      // Arrange
      const productosDisponibles = [mockProducto, mockProducto2];
      mockRepository.find.mockResolvedValue(productosDisponibles);

      // Act
      const result = await service.getAvailableProducts();

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { stock: MoreThan(0) },
        order: { nombre: 'ASC' },
      });
      expect(result).toEqual(productosDisponibles);
    });

    it('debería devolver array vacío si no hay productos disponibles', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getAvailableProducts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateProductoDto: UpdateProductoDto = {
      nombre: 'Laptop HP Actualizada',
      precio: 749.99,
    };

    it('debería actualizar un producto exitosamente', async () => {
      // Arrange
      const productoActualizado = { ...mockProducto, ...updateProductoDto };
      mockRepository.findOne
        .mockResolvedValueOnce(mockProducto)
        .mockResolvedValueOnce(productoActualizado);
      mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      // Act
      const result = await service.update(1, updateProductoDto);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, updateProductoDto);
      expect(result).toEqual(productoActualizado);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, updateProductoDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('debería reducir el stock correctamente', async () => {
      // Arrange
      const cantidadAReducir = 5;
      const productoConStockReducido = { ...mockProducto, stock: 10 };
      mockRepository.findOne
        .mockResolvedValueOnce(mockProducto)
        .mockResolvedValueOnce(productoConStockReducido);
      mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      // Act
      const result = await service.updateStock(1, cantidadAReducir);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        stock: mockProducto.stock - cantidadAReducir,
      });
      expect(result.stock).toBe(10);
    });

    it('debería lanzar BadRequestException si no hay suficiente stock', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);

      // Act & Assert
      await expect(service.updateStock(1, 100)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStock(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('increaseStock', () => {
    it('debería aumentar el stock correctamente', async () => {
      // Arrange
      const cantidadAAumentar = 10;
      const productoConStockAumentado = { ...mockProducto, stock: 25 };
      mockRepository.findOne
        .mockResolvedValueOnce(mockProducto)
        .mockResolvedValueOnce(productoConStockAumentado);
      mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      // Act
      const result = await service.increaseStock(1, cantidadAAumentar);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        stock: mockProducto.stock + cantidadAAumentar,
      });
      expect(result.stock).toBe(25);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.increaseStock(999, 20)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkStock', () => {
    it('debería retornar true si hay suficiente stock', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);

      // Act
      const result = await service.checkStock(1, 10);

      // Assert
      expect(result).toBe(true);
    });

    it('debería retornar false si no hay suficiente stock', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);

      // Act
      const result = await service.checkStock(1, 100);

      // Assert
      expect(result).toBe(false);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkStock(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('debería eliminar un producto exitosamente', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProducto);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      // Act
      const result = await service.remove(1);

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        message: 'Producto "Laptop HP" eliminado exitosamente',
      });
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findWithPagination', () => {
    it('debería devolver productos paginados', async () => {
      // Arrange
      const productos = [mockProducto, mockProducto2];
      mockRepository.findAndCount.mockResolvedValue([productos, 2]);

      // Act
      const result = await service.findWithPagination(1, 10);

      // Assert
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        order: { fechaCreacion: 'DESC' },
      });
      expect(result).toEqual({
        data: productos,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('debería calcular correctamente las páginas', async () => {
      // Arrange
      const productos = Array(10).fill(mockProducto);
      mockRepository.findAndCount.mockResolvedValue([productos, 25]);

      // Act
      const result = await service.findWithPagination(1, 10);

      // Assert
      expect(result.totalPages).toBe(3);
    });

    it('debería usar valores predeterminados', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[mockProducto], 1]);

      // Act
      const result = await service.findWithPagination();

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('fetchGoogleDriveImage', () => {
    const fileId = '1abc123xyz';
    const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('debería obtener una imagen de Google Drive exitosamente', async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await service.fetchGoogleDriveImage(fileId);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(imageUrl);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('debería lanzar NotFoundException si la imagen no se encuentra', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.fetchGoogleDriveImage(fileId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar NotFoundException si fetch falla', async () => {
      // Arrange
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(service.fetchGoogleDriveImage(fileId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});